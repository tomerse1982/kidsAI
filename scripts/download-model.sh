#!/usr/bin/env sh
# Downloads the multilingual embedding model into ./models (pinned revision) so the
# app and import worker can run fully offline. Usage: sh scripts/download-model.sh
set -e
REPO="Xenova/multilingual-e5-small"
REV="761b726dd34fb83930e26aab4e9ac3899aa1fa78"
DEST="${MODEL_DIR:-./models}/$REPO"
mkdir -p "$DEST/onnx"
for f in config.json tokenizer.json tokenizer_config.json special_tokens_map.json onnx/model_quantized.onnx; do
  if [ ! -s "$DEST/$f" ]; then
    echo "downloading $f"
    curl -fsSL --retry 6 --retry-all-errors --retry-delay 2 -o "$DEST/$f" "https://huggingface.co/$REPO/resolve/$REV/$f"
  fi
done
echo "model ready in $DEST"
