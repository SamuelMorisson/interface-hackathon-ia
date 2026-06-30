FROM nvcr.io/nvidia/tritonserver:24.08-pyt-python-py3

RUN pip install --no-cache-dir \
    transformers==4.45.2 \
    accelerate==0.34.2 \
    sentencepiece==0.2.0 \
    einops==0.8.0 \
    protobuf==4.25.3 \
    peft==0.12.0 \
    bitsandbytes==0.43.3

COPY model_repository /models
COPY models/phi3_financial /adapters/phi3_financial

ENV LORA_ADAPTER_PATH=/adapters/phi3_financial
ENV TRANSFORMERS_CACHE=/models/phi35_financial/hf-cache
ENV HF_HOME=/models/phi35_financial/hf-cache

CMD ["tritonserver", "--model-repository=/models", "--log-verbose=1"]
