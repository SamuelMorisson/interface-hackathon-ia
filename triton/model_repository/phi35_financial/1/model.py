import json
import os

os.environ["TRANSFORMERS_CACHE"] = "/models/phi35_financial/hf-cache"
os.environ["HF_HOME"] = "/models/phi35_financial/hf-cache"

import numpy as np
import torch
import triton_python_backend_utils as pb_utils
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


class TritonPythonModel:
    def initialize(self, args):
        self.logger = pb_utils.Logger
        self.model_config = json.loads(args["model_config"])
        self.model_params = self.model_config.get("parameters", {})

        base_model = self.model_params.get("huggingface_model", {}).get(
            "string_value", "microsoft/Phi-3-mini-4k-instruct"
        )
        adapter_path = os.environ.get("LORA_ADAPTER_PATH", "/adapters/phi3_financial")
        self.max_new_tokens = int(
            self.model_params.get("max_output_length", {}).get("string_value", "256")
        )

        self.logger.log_info(f"Base model: {base_model}")
        self.logger.log_info(f"LoRA adapter: {adapter_path}")
        self.logger.log_info(f"Max new tokens: {self.max_new_tokens}")

        self.tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )

        self.logger.log_info("Loading base model in 4-bit (VRAM optimized)...")
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
        )

        self.logger.log_info("Loading LoRA adapter...")
        self.model = PeftModel.from_pretrained(model, adapter_path)
        self.model.eval()
        self.logger.log_info("Model ready.")

    def execute(self, requests):
        responses = []
        for request in requests:
            input_tensor = pb_utils.get_input_tensor_by_name(request, "text_input")
            prompt = input_tensor.as_numpy()[0].decode("utf-8")
            responses.append(self.generate(prompt))
        return responses

    def generate(self, user_message):
        formatted_input = f"<|user|>\n{user_message}<|end|>\n<|assistant|>\n"

        inputs = self.tokenizer(
            formatted_input,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        inputs = {key: value.to(self.model.device) for key, value in inputs.items()}

        with torch.no_grad():
            outputs = self.model.generate(
                input_ids=inputs["input_ids"],
                attention_mask=inputs.get("attention_mask"),
                max_new_tokens=self.max_new_tokens,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )

        input_length = inputs["input_ids"].shape[1]
        new_tokens = outputs[0][input_length:]
        text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
        if text.endswith("<|end|>"):
            text = text[:-7].strip()

        tensor = pb_utils.Tensor("text_output", np.array([text], dtype=np.object_))
        return pb_utils.InferenceResponse(output_tensors=[tensor])

    def finalize(self):
        self.logger.log_info("Cleaning up...")
