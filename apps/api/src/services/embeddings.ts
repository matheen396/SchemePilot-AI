type Extractor = (text: string, options: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array }>;
let extractorPromise: Promise<Extractor> | undefined;

async function getExtractor(): Promise<Extractor> {
  extractorPromise ??= (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const createPipeline = pipeline as unknown as (task: string, model: string) => Promise<Extractor>;
    return createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  })();
  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const result = await extractor(text.slice(0, 4000), { pooling: 'mean', normalize: true });
  if (result.data.length !== 384) throw new Error(`Embedding model returned ${result.data.length} dimensions; expected 384`);
  return Array.from(result.data, Number);
}
