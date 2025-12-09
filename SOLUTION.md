# Real Solution: Replace transformers.js with ONNX Runtime

## The Problem
`@xenova/transformers` → depends on → `sharp` → tries to download binaries → fails on airgapped machines

## The Solution
Use `onnxruntime-node` directly instead of transformers.js:

```bash
npm install onnxruntime-node
npm uninstall @xenova/transformers
```

## Implementation

Replace the embedding service to use ONNX Runtime directly:

```typescript
import * as ort from 'onnxruntime-node';

export class EmbeddingService {
  private session: ort.InferenceSession | null = null;

  async initialize() {
    // Load the ONNX model directly
    this.session = await ort.InferenceSession.create(
      path.join(modelsDir, 'nomic-embed-text', 'model.onnx')
    );
  }

  async generate(text: string): Promise<number[]> {
    // Tokenize and run inference with ONNX Runtime
    const tokens = tokenize(text);
    const feeds = { input_ids: new ort.Tensor('int64', tokens, [1, tokens.length]) };
    const results = await this.session.run(feeds);
    return Array.from(results.last_hidden_state.data);
  }
}
```

## Benefits
- ✅ No sharp dependency
- ✅ No binary downloads during installation
- ✅ Works on airgapped machines
- ✅ Faster inference (ONNX Runtime is optimized)
- ✅ Smaller package size

## Alternative: Pre-bundle sharp binaries
If we must keep transformers.js, bundle the Windows sharp binaries directly in the package.
