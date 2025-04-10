import * as tf from '@tensorflow/tfjs-node';
import * as blazeface from '@tensorflow-models/blazeface';
import { join } from 'path';
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { Canvas, Image, loadImage } from 'canvas';

// 配置 TensorFlow.js 使用 canvas
const env = {
  Canvas,
  Image,
  ImageData: null,
  createCanvasElement: () => new Canvas(0, 0),
  createImageElement: () => new Image()
};

// 设置 TensorFlow.js 后端
tf.env().set('IS_BROWSER', false);
tf.env().set('IS_NODE', true);

async function loadFaceDetectionModel() {
  try {
    console.log('开始加载人脸检测模型...');
    const model = await blazeface.load();
    console.log('模型加载成功');
    return model;
  } catch (error) {
    console.error('加载模型时出错:', error);
    throw error;
  }
}

async function train() {
  console.log('开始训练过程...');
  
  // 确保 models 目录存在
  const modelsDir = join(process.cwd(), 'public', 'models');
  if (!existsSync(modelsDir)) {
    console.log('创建 models 目录');
    mkdirSync(modelsDir, { recursive: true });
  }

  // 加载模型
  console.log('加载人脸检测模型...');
  const model = await loadFaceDetectionModel();
  console.log('模型加载成功');

  // 读取学生照片
  const studentsDir = join(process.cwd(), 'public', 'students');
  const studentFiles = readdirSync(studentsDir)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));

  console.log(`找到 ${studentFiles.length} 张学生照片`);

  const studentDescriptors = [];

  // 处理每张照片
  for (const file of studentFiles) {
    const studentName = file.replace(/\.(jpg|png)$/, '');
    console.log(`处理 ${studentName} 的照片...`);

    try {
      const imagePath = join(studentsDir, file);
      console.log(`加载图片: ${imagePath}`);
      const img = await loadImage(imagePath);
      
      // 创建 canvas 并绘制图像
      const canvas = new Canvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // 将 canvas 转换为 tensor
      console.log('将图片转换为 tensor...');
      const imageTensor = tf.browser.fromPixels(canvas);
      
      // 检测人脸
      console.log('检测人脸...');
      const predictions = await model.estimateFaces(imageTensor, false);
      console.log(`检测到 ${predictions.length} 个人脸`);
      
      if (predictions.length > 0) {
        const face = predictions[0];
        console.log('人脸概率:', face.probability);
        
        // 使用面部关键点和概率作为描述符
        const descriptor = [
          ...face.landmarks.map(point => [point[0], point[1]]).flat(),
          face.probability
        ];
        
        studentDescriptors.push({
          name: studentName,
          descriptor: descriptor
        });
        console.log(`成功处理 ${studentName} 的照片`);
      } else {
        console.warn(`在 ${studentName} 的照片中未检测到人脸`);
      }

      // 清理 tensor
      imageTensor.dispose();
    } catch (error) {
      console.error(`处理 ${studentName} 的照片时出错:`, error);
    }
  }

  // 保存训练结果
  const outputPath = join(modelsDir, 'student_descriptors.json');
  const outputData = studentDescriptors.map(desc => ({
    name: desc.name,
    descriptor: Array.from(desc.descriptor)
  }));

  console.log('保存训练结果...');
  writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`训练完成。结果已保存到 ${outputPath}`);
  console.log(`成功处理 ${studentDescriptors.length} 个学生`);
}

train().catch(console.error); 