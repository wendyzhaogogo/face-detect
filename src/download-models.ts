import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const modelsDir = join(process.cwd(), 'public', 'models');

// 确保 models 目录存在
if (!existsSync(modelsDir)) {
  mkdirSync(modelsDir, { recursive: true });
}

// 模型文件列表
const modelFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

console.log('Downloading model files...');

// 下载每个模型文件
for (const file of modelFiles) {
  const url = `https://github.com/justadudewhohacks/face-api.js/raw/master/weights/${file}`;
  const outputPath = join(modelsDir, file);
  
  try {
    execSync(`curl -L "${url}" -o "${outputPath}"`);
    console.log(`Downloaded ${file}`);
  } catch (error) {
    console.error(`Error downloading ${file}:`, error);
  }
}

console.log('All model files downloaded successfully!'); 