import { useState, useRef, useEffect } from "react";
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import "./App.css";

interface Student {
  name: string;
  image: string;
}

interface StudentDescriptorData {
  name: string;
  descriptor: number[];
}

// 学生照片列表
const STUDENT_PHOTOS = [
  { name: "赵文", image: "/students/赵文.png" },
  // 在这里添加更多学生照片
];

// 人脸识别阈值，值越小越严格
const FACE_MATCH_THRESHOLD = 0.6;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);  // 用于显示视频
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);  // 用于显示识别信息
  const [students] = useState<Student[]>(STUDENT_PHOTOS);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedStudent, setDetectedStudent] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [studentDescriptors, setStudentDescriptors] = useState<StudentDescriptorData[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // 加载模型和训练数据
  useEffect(() => {
    const loadModelsAndData = async () => {
      try {
        console.log('开始加载模型...');
        // 加载面部检测模型
        const detector = await blazeface.load();
        console.log('模型加载成功');
        setModel(detector);

        // 加载训练数据
        console.log('开始加载训练数据...');
        const response = await fetch('/models/student_descriptors.json');
        const data = await response.json() as StudentDescriptorData[];
        console.log('训练数据加载成功:', data);
        setStudentDescriptors(data);
        
        setIsLoading(false);
      } catch (error) {
        console.error("加载模型或训练数据时出错:", error);
      }
    };

    loadModelsAndData();
  }, []);

  // 计算两个描述符之间的欧氏距离
  const calculateDistance = (desc1: number[], desc2: number[]) => {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
  };

  // 视频初始化
  useEffect(() => {
    if (isLoading || !videoRef.current || !overlayCanvasRef.current || !model) return;

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext("2d");

    // 设置画布尺寸
    overlayCanvas.width = 640;
    overlayCanvas.height = 480;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          },
        });
        
        video.srcObject = stream;
        
        // 等待视频元数据加载完成
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          // 设置超时
          setTimeout(() => reject(new Error('视频加载超时')), 5000);
        });
        
        // 确保视频元素准备好播放
        if (video.readyState < 2) {
          await new Promise(resolve => {
            video.oncanplay = resolve;
          });
        }
        
        await video.play();
        console.log('摄像头启动成功');
      } catch (err) {
        console.error("访问摄像头时出错:", err);
      }
    };

    // 初始启动摄像头
    startVideo();

    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    };
  }, [isLoading, model]); // 只依赖 isLoading 和 model

  // 人脸检测
  useEffect(() => {
    if (isLoading || !videoRef.current || !overlayCanvasRef.current || !model) return;

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext("2d");
    let lastDetectionTime = 0;
    let lastDetectedStudent: string | null = null;
    let lastConfidence = 0;

    const drawFaceBox = (face: blazeface.NormalizedFace, studentName: string | null, confidence: number) => {
      if (!overlayCtx) return;

      const topLeft = face.topLeft as [number, number];
      const bottomRight = face.bottomRight as [number, number];
      const width = bottomRight[0] - topLeft[0];
      const height = bottomRight[1] - topLeft[1];

      // 清除之前的标注
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      // 保存当前状态
      overlayCtx.save();
      
      // 应用镜像变换
      overlayCtx.scale(-1, 1);
      overlayCtx.translate(-overlayCanvas.width, 0);

      if (studentName) {
        // 绘制红色识别框
        overlayCtx.strokeStyle = "#FF0000";
        overlayCtx.lineWidth = 3;
        overlayCtx.shadowColor = "rgba(255, 0, 0, 0.4)";
        overlayCtx.shadowBlur = 8;
        overlayCtx.strokeRect(topLeft[0], topLeft[1], width, height);
        overlayCtx.shadowBlur = 0;
        
        // 绘制名字和置信度
        const labelText = `${studentName} (${confidence.toFixed(1)}%)`;
        overlayCtx.font = "bold 16px Arial";
        const labelWidth = overlayCtx.measureText(labelText).width + 20;
        const labelHeight = 28;
        const labelX = topLeft[0] + (width - labelWidth) / 2;
        const labelY = topLeft[1] + height + 5;
        
        overlayCtx.fillStyle = "rgba(255, 0, 0, 0.9)";
        overlayCtx.beginPath();
        overlayCtx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
        overlayCtx.fill();
        
        overlayCtx.fillStyle = "white";
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.fillText(labelText, labelX + labelWidth/2, labelY + labelHeight/2);
      } else {
        // 绘制蓝色未识别框
        overlayCtx.strokeStyle = "#0000FF";
        overlayCtx.lineWidth = 2;
        overlayCtx.strokeRect(topLeft[0], topLeft[1], width, height);
        
        const labelText = "未识别";
        overlayCtx.font = "bold 16px Arial";
        const labelWidth = overlayCtx.measureText(labelText).width + 20;
        const labelHeight = 28;
        const labelX = topLeft[0] + (width - labelWidth) / 2;
        const labelY = topLeft[1] + height + 5;
        
        overlayCtx.fillStyle = "rgba(0, 0, 255, 0.9)";
        overlayCtx.beginPath();
        overlayCtx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
        overlayCtx.fill();
        
        overlayCtx.fillStyle = "white";
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.fillText(labelText, labelX + labelWidth/2, labelY + labelHeight/2);
      }

      // 恢复之前的状态
      overlayCtx.restore();
    };

    const detectFaces = async () => {
      if (isDetecting || !model || !overlayCtx || !video.videoWidth || !video.videoHeight) return;
      
      const now = Date.now();
      if (now - lastDetectionTime < 300) return;
      
      setIsDetecting(true);
      lastDetectionTime = now;

      try {
        const imageTensor = tf.browser.fromPixels(video);
        const predictions = await model.estimateFaces(imageTensor, false);
        
        if (predictions.length > 0) {
          const face = predictions[0];
          console.log('检测到人脸，概率:', face.probability);
          
          const landmarks = face.landmarks as number[][];
          const probability = face.probability as number;
          const currentDescriptor = [
            ...landmarks.map((point) => [point[0], point[1]]).flat(),
            probability
          ].filter((value): value is number => typeof value === 'number' && !isNaN(value));

          if (studentDescriptors.length > 0) {
            let bestMatch = { name: '', distance: Infinity };
            
            for (const student of studentDescriptors) {
              const distance = calculateDistance(currentDescriptor, student.descriptor);
              if (distance < bestMatch.distance) {
                bestMatch = { name: student.name, distance };
              }
            }

            const confidenceScore = Math.max(0, Math.min(100, 100 - (bestMatch.distance * 100)));
            console.log('最佳匹配:', bestMatch.name, '距离:', bestMatch.distance, '置信度:', confidenceScore);
            
            if (bestMatch.name !== lastDetectedStudent || confidenceScore !== lastConfidence) {
              setConfidence(confidenceScore);
              lastConfidence = confidenceScore;
              
              if (bestMatch.distance < FACE_MATCH_THRESHOLD) {
                setDetectedStudent(bestMatch.name);
                lastDetectedStudent = bestMatch.name;
                drawFaceBox(face, bestMatch.name, confidenceScore);
              } else {
                setDetectedStudent(null);
                lastDetectedStudent = null;
                drawFaceBox(face, null, 0);
              }
            }
          }
        } else {
          console.log('未检测到人脸');
          if (lastDetectedStudent !== null) {
            setDetectedStudent(null);
            setConfidence(0);
            lastDetectedStudent = null;
            lastConfidence = 0;
            overlayCtx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          }
        }

        imageTensor.dispose();
      } catch (error) {
        console.error('检测人脸时出错:', error);
        overlayCtx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      } finally {
        setIsDetecting(false);
      }
    };

    // 开始人脸检测循环
    const detectionInterval = setInterval(detectFaces, 100);

    return () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [isLoading, model, studentDescriptors]); // 不依赖 isDetecting

  if (isLoading) {
    return <div className="loading">正在加载模型...</div>;
  }

  // 根据置信度确定样式
  const getConfidenceClass = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  return (
    <div className="App">
      <h1>人脸识别系统</h1>
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "640px",
            height: "480px",
            transform: "scaleX(-1)",
            zIndex: 1
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "640px",
            height: "480px",
            transform: "scaleX(-1)",
            zIndex: 2
          }}
        />
      </div>
      {detectedStudent && (
        <div className="detection-result">
          <h2>识别结果: {detectedStudent}</h2>
          <div className="confidence-bar">
            <div 
              className={`confidence-fill ${getConfidenceClass(confidence)}`}
              style={{ width: `${confidence}%` }}
            />
            <span className="confidence-text">置信度: {confidence.toFixed(1)}%</span>
          </div>
        </div>
      )}
      <div className="students-list">
        <h2>学生列表</h2>
        <div className="students-grid">
          {students.map((student) => (
            <div
              key={student.name}
              className={`student-card ${
                detectedStudent === student.name ? "active" : ""
              }`}
            >
              <img src={student.image} alt={student.name} />
              <p>{student.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
