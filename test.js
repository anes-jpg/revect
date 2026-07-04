import { init, convertImageToSvgDefault, convertImageToSvg, TracerConfig } from 'wasm_vtracer';

async function run() {
  await init();
  const width = 10;
  const height = 10;
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i+1] = 0;
    pixels[i+2] = 0;
    pixels[i+3] = 0;
  }
  const config = new TracerConfig();
  config.setColorMode(1); // Binary

  const svg = convertImageToSvg(pixels, width, height, config);
  console.log(svg);
}

run().catch(console.error);
