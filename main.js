import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


// 创建场景
const scene = new THREE.Scene();

// 定义 canvas 尺寸
const canvasWidth = window.innerWidth;
const canvasHeight = 300;

// 创建正交相机
const aspect = canvasWidth / canvasHeight;
const frustumSize = 8;
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
controls.enableDamping = true; // ��效果
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

  const numberOfLines = 36;
  const interval = width / (numberOfLines );
  const lines = new THREE.Group();

  for (let i = 0; i <= numberOfLines; i++) {
    const x = boundingBox.min.x + (i * interval);

    // 创建竖线
    const points = [];
    points.push(new THREE.Vector3(x, boundingBox.min.y - height * 0.1, 0));
    points.push(new THREE.Vector3(x, boundingBox.max.y + height * 0.1, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    lines.add(line);

    // 为每个标签创建独立的 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    // 设置文字样式
    context.font = 'Bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';

    const text = i;  // 序号从1开始

    // 绘制序号
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text.toString(), canvas.width/2, canvas.height/2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, boundingBox.min.y - height * 0.2, 0);
    sprite.scale.set(1, 0.5, 1);
    lines.add(sprite);
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

// 添加一个函数来计算当前视图中心对应的下标
function getCurrentCenterIndex() {
  // 获取盒子的边界
  const boundingBox = new THREE.Box3().setFromObject(box);
  const width = boundingBox.max.x - boundingBox.min.x;

  // 获取当前相机位置（视图中心）
  const centerX = camera.position.x;

  // 计算相对于盒子左边界的位置
  const relativeX = centerX - boundingBox.min.x;

  // 计算间隔宽度
  const interval = width /36;

  // 计算下标（可以是小数）
  const index = relativeX / interval;

  return index;
}

// 修改 animate 函数，添加中心下标的打印
function animate() {
  requestAnimationFrame(animate);

  // 获取并输出可见性信息
  const visibility = getHorizontalVisibility(box);


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
  return fitObjectHeight(camera, box, 0.6); // 设置为占据 80% 高度
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

  // 计算相机的视锥体度
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

// 添加一个函数来将视图对准指定的数字
function focusOnNumber(number) {
  // 确保数字在有效范围内(1-36)
  const targetNumber = Math.max(1, Math.min(36, number));

  // 获取盒子的边界
  const boundingBox = new THREE.Box3().setFromObject(box);
  const width = boundingBox.max.x - boundingBox.min.x;

  // 计算目标数字的x坐标
  // 因为数字从1开始，所以需要减1来对应数组索引
  const interval = width / (36 - 1);
  const targetX = boundingBox.min.x + ((targetNumber - 1) * interval);

  // 更新相机和控制器的目标位置
  camera.position.x = targetX;
  controls.target.x = targetX;

  // 更新相机矩阵
  camera.updateProjectionMatrix();
  controls.update();
}

// 将函数暴露给全局作用域，以便可以从控制台调用
window.focusOnNumber = focusOnNumber;

// 添加一个函数来将视图对准两个数字的中间位置
function focusOnNumberRange(startPercent, endPercent) {
    // 确保百分比在0-100之间
    startPercent = Math.max(0, Math.min(100, startPercent));
    endPercent = Math.max(0, Math.min(100, endPercent));

    // 获取盒子的边界
    const boundingBox = new THREE.Box3().setFromObject(box);
    const width = boundingBox.max.x - boundingBox.min.x;

    // 根据百分比计算实际的x坐标
    const startX = boundingBox.min.x + (width * startPercent / 100);
    const endX = boundingBox.min.x + (width * endPercent / 100);

    // 计算中间位置
    const centerX = (startX + endX) / 2;

    // 更新相机和控制器的目标位置
    camera.position.x = centerX;
    controls.target.x = centerX;

    // 计算需要显示的范围宽度
    const rangeWidth = Math.abs(endX - startX);

    // 调整缩放以显示整个范围
    const zoom = frustumSize / (rangeWidth * 1.2); // 1.2是为了留一些边距
    setZoom(zoom);

    // 更新相机矩阵
    camera.updateProjectionMatrix();
    controls.update();
    window.fitToHeight();
    const centerIndex = getCurrentCenterIndex();
    console.log(`当前视图中心下标: ${centerIndex.toFixed(2)}`);
}

// 将函数暴露给全局作用域
window.focusOnNumberRange = focusOnNumberRange;
