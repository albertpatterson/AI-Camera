let model = null;
getModel();

let launched = false;
async function launchCamera() {
  try {
    if (launched) {
      return;
    }
    launched = true;

    startLoading();

    const app = document.getElementById('camera-app');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas-canvas');

    app.style.display = 'block';

    const stream = await getVideoStream();
    video.srcObject = stream;

    await initiateVideoAndCanvas(video, canvas);

    const model = await getModel();

    clearLoading();
    takepictures(video, canvas, model);
  } catch (error) {
    document.getElementById('error').innerText = error.message;
  }
}

async function getVideoStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          exact: 'environment',
        },
      },
      audio: false,
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  }
}

function initiateVideoAndCanvas(video, canvas) {
  const done = new Promise((res) => {
    const handler = () => {
      const { height, width } = getCanvasSize(video);
      video.setAttribute('width', width);
      video.setAttribute('height', height);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);

      const context = canvas.getContext('2d');
      context.font = '36px serif';
      context.fontWeight = 'bold';
      context.strokeStyle = 'green';
      context.fillStyle = 'green';
      context.lineWidth = 5;

      video.removeEventListener('canplay', handler, false);
      res();
    };

    video.addEventListener('canplay', handler, false);
  });

  video.play();

  return done;
}

function getCanvasSize(video) {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;

  const aspectRatio = vHeight / vWidth;

  const width = Math.min(vWidth, window.innerWidth);
  const height = width * aspectRatio;
  const scale = width / vWidth;

  return { height, width, scale };
}

async function takepictures(video, canvas, model) {
  const context = canvas.getContext('2d');

  const { height, width, scale } = getCanvasSize(video);

  const predictions = await model.detect(video);

  context.drawImage(video, 0, 0, width, height);

  drawPredictions(video, context, predictions, scale);

  requestAnimationFrame(() => {
    takepictures(video, canvas, model, false);
  });
}

function drawPredictions(video, context, predictions, scale) {
  for (const prediction of predictions) {
    const [xRaw, yRaw, heightRaw, widthRaw] = prediction.bbox;
    const x = xRaw * scale;
    const y = yRaw * scale;
    const height = heightRaw * scale;
    const width = widthRaw * scale;
    context.strokeRect(x, y, height, width);
    context.fillText(prediction.class, x + 5, y + 25);
  }
}

function getModel() {
  return new Promise((resolve) => {
    if (model) {
      resolve(model);
    }
    cocoSsd.load().then((loadedModel) => {
      model = loadedModel;
      resolve(model);
    });
  });
}

let extraLoadingInfoTimeout = null;
function startLoading() {
  clearLaunchButton();
  extraLoadingInfoTimeout = setTimeout(() => {
    document.getElementById('extra-loading-info').style.display = 'block';
  }, 10e3);
}

function clearLaunchButton() {
  const launchButton = document.getElementById('launch-button');
  launchButton.parentElement.removeChild(launchButton);
}

function clearLoading() {
  clearTimeout(extraLoadingInfoTimeout);
  const loadingIndicator = document.getElementById('loading-indicator');
  loadingIndicator.parentElement.removeChild(loadingIndicator);
}
