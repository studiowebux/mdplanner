import argparse
import re
import sys
import torch

try:
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS
except ImportError as e:
    print(f"Error: Missing required package. Please install with:")
    print("pip install chatterbox-tts torch torchaudio")
    print(f"Original error: {e}")
    sys.exit(1)


def split_text(text, max_chars=400):
    """Split text into chunks at sentence boundaries, respecting max_chars."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current = (current + " " + sentence).strip()
        else:
            if current:
                chunks.append(current)
            # Sentence is longer than max_chars — split at word boundaries
            if len(sentence) > max_chars:
                words = sentence.split()
                word_chunk = ""
                for word in words:
                    if len(word_chunk) + len(word) + 1 <= max_chars:
                        word_chunk = (word_chunk + " " + word).strip()
                    else:
                        if word_chunk:
                            chunks.append(word_chunk)
                        word_chunk = word
                if word_chunk:
                    chunks.append(word_chunk)
                current = ""
            else:
                current = sentence

    if current:
        chunks.append(current)

    return [c for c in chunks if c.strip()]


def main():
    parser = argparse.ArgumentParser(description='Chatterbox TTS CLI')
    parser.add_argument('--text', required=True, help='Text to synthesize')
    parser.add_argument('--reference', required=True, help='Reference audio file path')
    parser.add_argument('--exageration', type=float, default=0.5, help='Exaggeration level (default: 0.5)')
    parser.add_argument('--cfg_weight', type=float, default=0.5, help='CFG weight (default: 0.5)')
    parser.add_argument('--output', required=True, help='Output audio file path')
    parser.add_argument('--split', action='store_true', help='Split long text into chunks')
    parser.add_argument('--split_chars', type=int, default=400, help='Max characters per chunk when splitting (default: 400)')

    args = parser.parse_args()

    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"

    print(f"Using device: {device}")

    model = ChatterboxTTS.from_pretrained(device=device)

    if args.split and len(args.text) > args.split_chars:
        chunks = split_text(args.text, args.split_chars)
        print(f"Splitting into {len(chunks)} chunks")

        all_wavs = []
        for i, chunk in enumerate(chunks):
            print(f"Chunk {i + 1}/{len(chunks)}: {chunk[:60]}...")
            wav = model.generate(
                chunk,
                audio_prompt_path=args.reference,
                exaggeration=args.exageration,
                cfg_weight=args.cfg_weight,
            )
            all_wavs.append(wav)

        combined = torch.cat(all_wavs, dim=-1)
        ta.save(args.output, combined, model.sr)
    else:
        wav = model.generate(
            args.text,
            audio_prompt_path=args.reference,
            exaggeration=args.exageration,
            cfg_weight=args.cfg_weight,
        )
        ta.save(args.output, wav, model.sr)

    print(f"Audio saved to: {args.output}")


if __name__ == "__main__":
    main()
