# 学生人脸识别系统

这是一个纯前端的 React 项目，使用 TensorFlow.js 实现人脸检测功能。

## 功能特点

- 实时摄像头人脸检测
- 显示学生照片和姓名
- 纯前端实现，无需后端服务器

## 使用方法

1. 安装依赖：
```bash
npm install
```

2. 将学生照片放入 `public/students` 目录，照片命名格式为：`学生姓名.jpg`

3. 在 `src/App.tsx` 文件中的 `STUDENT_PHOTOS` 数组中添加学生信息：
```typescript
const STUDENT_PHOTOS = [
  { name: '张三', image: '/students/张三.jpg' },
  { name: '李四', image: '/students/李四.jpg' },
  // 添加更多学生...
];
```

4. 启动开发服务器：
```bash
npm run dev
```

5. 在浏览器中访问显示的地址（通常是 http://localhost:5173）

## 注意事项

- 确保照片清晰，正面拍摄
- 照片建议使用 jpg 格式
- 需要允许浏览器访问摄像头
- 建议在光线充足的环境下使用
