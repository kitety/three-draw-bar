import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


// 创建场景
const scene = new THREE.Scene();

// 定义 canvas 尺寸
const canvasWidth = window.innerWidth;
const canvasHeight = 300;

// 创建正交相机
const aspect = canvasWidth / canvasHeight;
const frustumSize = 80;
const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2, // left
  (frustumSize * aspect) / 2,   // right
  frustumSize / 2,              // top
  frustumSize / -2,             // bottom
  0.1,                          // near
  1000                          // far
);
camera.position.set(0, 0, 50);
camera.lookAt(0, 0, 0);

// 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(canvasWidth, canvasHeight);
document.querySelector('#app').appendChild(renderer.domElement);

// 设置 canvas 样式，确保其宽度为 100%，高度为 300px
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '300px';

// 添加轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // ���阻尼效果
controls.enablePan = true;     // 启用平移
controls.enableZoom = true;    // 启用缩放

// 限制垂直平移
controls.minPolarAngle = Math.PI / 2; // 90度
controls.maxPolarAngle = Math.PI / 2; // 90度

// 禁用旋转
controls.enableRotate = false;

// 限制平移方向
controls.panSpeed = 1;

// 自定义鼠标按钮绑定
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.ZOOM,
  RIGHT: THREE.MOUSE.PAN,
};

let lastVisibility = null;

// 添加自定义平移处理
const oldPan = controls.pan;
controls.pan = function (deltaX, deltaY) {
  // 只处理水平方向的平移
  oldPan.call(this, deltaX, 0);
};

// 添加一个长方体用于测试
const geometry = new THREE.BoxGeometry(40, 2, 10);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const box = new THREE.Mesh(geometry, material);
scene.add(box);

// 添加竖线标记
function addVerticalLines(box) {
  // 获取盒子的边界
  const boundingBox = new THREE.Box3().setFromObject(box);
  const width = boundingBox.max.x - boundingBox.min.x;
  const height = boundingBox.max.y - boundingBox.min.y;

  // 创建竖线的材质
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1,
  });

  // 设置间隔
  const interval = 0.2;
  const lines = new THREE.Group();

  for (let x = boundingBox.min.x; x <= boundingBox.max.x; x += interval) {
    const points = [];
    points.push(new THREE.Vector3(x, boundingBox.min.y - height * 0.1, 0));
    points.push(new THREE.Vector3(x, boundingBox.max.y + height * 0.1, 0));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    lines.add(line);
  }

  scene.add(lines);
  return lines;
}

// 在创建 box 后添加竖线
const verticalLines = addVerticalLines(box);

// 添加一个函数来计算水平可见范围
function getHorizontalVisibility(object) {
  // 获取对象的边界框
  const boundingBox = new THREE.Box3().setFromObject(object);
  const objectWidth = boundingBox.max.x - boundingBox.min.x;

  // 获取当前 canvas 的尺寸
  const canvasWidth = renderer.domElement.clientWidth;
  const canvasHeight = renderer.domElement.clientHeight;

  // 获取相机视野的水平范围
  const cameraFrustumWidth = frustumSize * (canvasWidth / canvasHeight);
  const cameraLeft = camera.position.x - (cameraFrustumWidth / 2) / camera.zoom;
  const cameraRight = camera.position.x + (cameraFrustumWidth / 2) / camera.zoom;

  // 计算对象的左右边界
  const objectLeft = boundingBox.min.x;
  const objectRight = boundingBox.max.x;

  // 计算可见部分
  const visibleLeft = Math.max(objectLeft, cameraLeft);
  const visibleRight = Math.min(objectRight, cameraRight);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);

  // 计算可见百分比
  const visibilityPercent = (visibleWidth / objectWidth) * 100;

  // 计算开始和结束的百分比
  const startPercent = ((visibleLeft - objectLeft) / objectWidth) * 100;
  const endPercent = ((visibleRight - objectLeft) / objectWidth) * 100;

  return {
    total: visibilityPercent,
    start: startPercent,
    end: endPercent,
  };
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  // 获取并输出可见性信息
  const visibility = getHorizontalVisibility(box);
  console.log(
    `可见度: ${visibility.total.toFixed(2)}%, 从${visibility.start.toFixed(
      2
    )}%到${visibility.end.toFixed(2)}%，缩放比: ${camera.zoom}`
  );
  lastVisibility = visibility;

  renderer.render(scene, camera);
  controls.update(); // 更新控制器
}
animate();

window.setZoom = (zoomLevel) => {
  // 限制缩放范围，防止过度缩放
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 100;
  const clampedZoom = Math.min(Math.max(zoomLevel, MIN_ZOOM), MAX_ZOOM);

  camera.zoom = clampedZoom;
  camera.updateProjectionMatrix();

  return clampedZoom; // 返回实际应用的缩放值
};

// 处理窗口缩放
window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = canvasHeight; // 高度保持为 300px
  const newAspect = newWidth / newHeight;

  camera.left = (frustumSize * newAspect) / -2;
  camera.right = (frustumSize * newAspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
});

// 添加一个函数来计算合适的缩放值以适应物体高度
function fitObjectHeight(camera, object, heightPercentage = 0.8) {
  // 创建包围盒
  const boundingBox = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  // 获取物体的高度
  const objectHeight = size.y;

  // 计算当前视野中的可见高度
  const visibleHeight = frustumSize;

  // 计算需要的放值
  const zoom = (visibleHeight / objectHeight) * heightPercentage;

  // 应用缩放
  setZoom(zoom);

  return zoom;
}

// 使用示例
window.fitToHeight = () => {
  return fitObjectHeight(camera, box, 0.8); // 设置为占据 80% 高度
};
window.fitToHeight();

// 根据给定的开始和结束百分比，调整相机视野
window.setViewByPercentages = function(startPercent, endPercent) {
  // 获取物体的边界框
  const boundingBox = new THREE.Box3().setFromObject(box);
  const objectWidth = boundingBox.max.x - boundingBox.min.x;

  // 确保百分比在 0% 到 100% 之间
  startPercent = Math.max(0, Math.min(100, startPercent));
  endPercent = Math.max(0, Math.min(100, endPercent));

  // 计算需要显示的部分的实际宽度
  const visibleWidth = (endPercent - startPercent) / 100 * objectWidth;

  // 获取当前 canvas 的尺寸
  const canvasWidth = renderer.domElement.clientWidth;
  const canvasHeight = renderer.domElement.clientHeight;

  // 计算相机的视锥体宽度
  const canvasAspect = canvasWidth / canvasHeight;
  const frustumWidth = frustumSize * canvasAspect;

  // 计算相机的缩放程度，使得指定的部分正好填充视野宽度
  const requiredZoom = frustumWidth / visibleWidth;

  // 应用缩放
  setZoom(requiredZoom);

  // 计算需要移动到的位置，使得指定部分居中
  const objectLeft = boundingBox.min.x;
  const visibleCenter = objectLeft + ((startPercent + endPercent) / 200) * objectWidth;

  // 更新相机位置
  camera.position.x = visibleCenter;

  // 更新投影矩阵
  camera.updateProjectionMatrix();

  // **移除以下行，避免再次调整相机缩放**
  // 保持物体高度不变
  // fitObjectHeight(camera, box, 0.8);
};
