const video3 = document.getElementsByClassName("input_video3")[0];
const out3 = document.getElementsByClassName("output3")[0];
const controlsElement3 = document.getElementsByClassName("control3")[0];
const canvasCtx3 = out3.getContext("2d");
const fpsControl = new FPS();

SCALE_VAR = 520;

let throttleTimer;
const throttle = (callback, time) => {
  if (throttleTimer) return;
  throttleTimer = true;
  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};

const spinner = document.querySelector(".loading");
spinner.ontransitionend = () => {
  spinner.style.display = "none";
};

function onResultsHands(results) {
  document.body.classList.add("loaded");
  fpsControl.tick();

  canvasCtx3.save();
  canvasCtx3.clearRect(0, 0, out3.width, out3.height);
  canvasCtx3.drawImage(results.image, 0, 0, out3.width, out3.height);
  if (results.multiHandLandmarks && results.multiHandedness) {
    let box1, box2;
    // let box1 = {x:0,y:0, height:0,width:0}, box2={x:0,y:0, height:0,width:0}

    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const boundingBox = getBoundingBox(results.multiHandLandmarks[index]);
      if (index == 0) {
        box1 = boundingBox;
      } else {
        box2 = boundingBox;
      }

      // // Draw the bounding box
      // canvasCtx3.strokeStyle = '#00FF00';
      // canvasCtx3.lineWidth = 4;
      // canvasCtx3.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
      const isRightHand = classification.label === "Right";
      const landmarks = results.multiHandLandmarks[index];
      // drawConnectors(canvasCtx3, landmarks, HAND_CONNECTIONS, {
      //   color: isRightHand ? "#00FF00" : "#FF0000",
      // }),
      //   drawLandmarks(canvasCtx3, landmarks, {
      //     color: isRightHand ? "#00FF00" : "#FF0000",
      //     fillColor: isRightHand ? "#FF0000" : "#00FF00",
      //     radius: (x) => {
      //       return lerp(x.from.z, -0.15, 0.1, 10, 1);
      //     },
      //   });
    }
    let boundingBox;
    if (!box2) {
      boundingBox = box1;
    } else {
      boundingBox = getCombinedBoundingBox(box1, box2);
    }
    canvasCtx3.strokeStyle = "#00FF00";
    canvasCtx3.lineWidth = 4;
    canvasCtx3.strokeRect(
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    );
    const img = showCanvasAsImage(out3, boundingBox);
    throttle(() => {
      recognize(img);
    }, 500);
  }

  // console.log(results);
  // const boundingBox = getBoundingBox(results.multiHandLandmarks[0]);
  // canvasCtx3.strokeStyle = '#00FF00';
  // canvasCtx3.lineWidth = 4;
  // canvasCtx3.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
  canvasCtx3.restore();
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
  },
});
hands.onResults(onResultsHands);

const camera = new Camera(video3, {
  onFrame: async () => {
    await hands.send({ image: video3 });
  },
  facingMode: "environment",
  width: 480,
  height: 480,
});
camera.start();

new ControlPanel(controlsElement3, {
  selfieMode: true,
  maxNumHands: 4,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
})
  .add([
    new StaticText({ title: "MediaPipe Hands" }),
    fpsControl,
    new Toggle({ title: "Selfie Mode", field: "selfieMode" }),
    new Slider({
      title: "Max Number of Hands",
      field: "maxNumHands",
      range: [1, 4],
      step: 1,
    }),
    new Slider({
      title: "Min Detection Confidence",
      field: "minDetectionConfidence",
      range: [0, 1],
      step: 0.01,
    }),
    new Slider({
      title: "Min Tracking Confidence",
      field: "minTrackingConfidence",
      range: [0, 1],
      step: 0.01,
    }),
  ])
  .on((options) => {
    video3.classList.toggle("selfie", options.selfieMode);
    hands.setOptions(options);
  });

function getCombinedBoundingBox(box1, box2) {
  const x1 = Math.min(box1.x, box2.x);
  const y1 = Math.min(box1.y, box2.y);
  const x2 = Math.max(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.max(box1.y + box1.height, box2.y + box2.height);
  const width = x2 - x1;
  const height = y2 - y1;
  return { x: x1, y: y1, width: width, height: height };
}

// Function to get the bounding box for a set of hand
function getBoundingBox(handLandmarks) {
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;

  for (const landmark of handLandmarks) {
    xMin = Math.min(xMin, landmark.x);
    yMin = Math.min(yMin, landmark.y);
    xMax = Math.max(xMax, landmark.x);
    yMax = Math.max(yMax, landmark.y);
  }

  const boundingBox = {
    x: xMin * SCALE_VAR - 40,
    y: yMin * SCALE_VAR - 40,
    width: (xMax - xMin) * SCALE_VAR * 1.25,
    height: (yMax - yMin) * SCALE_VAR * 1.25,
  };

  return boundingBox;
}

function showCanvasAsImage(canvas, boundingBox) {
  // Create a new image element
  const image = new Image();

  // Create a temporary canvas element to hold the cropped image
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = boundingBox.width;
  croppedCanvas.height = boundingBox.height;

  // Get the canvas context and draw the cropped image onto it
  const context = croppedCanvas.getContext("2d");
  context.drawImage(
    canvas,
    boundingBox.x,
    boundingBox.y,
    boundingBox.width,
    boundingBox.height,
    0,
    0,
    boundingBox.width,
    boundingBox.height
  );

  // convert binary

  // Set the image source to the cropped canvas data URL
  image.src = croppedCanvas.toDataURL();
  // var newFormData = new FormData();
  // newFormData.append("image", croppedCanvas.toDataURL("image/jpeg"));

  // createImageBitmap(croppedCanvas.toBlob())

  // Add the image to the document body
  const ele = document.getElementById("result");
  ele.innerHTML = "";
  // ele.appendChild(image);

  return croppedCanvas.toDataURL("image/png", 1);
}

if ("serviceWorker" in navigator) {
  // register service worker
  navigator.serviceWorker.register("service-worker.js");
}

window.customURL = "https://a4f3-220-158-168-162.ngrok-free.app/predict";

function recognize(data) {
  console.log("fds");
  fetch(window.customURL, {
    // fetch("http://10.12.1.245:8000/predict", {
    method: "POST",
    body: data,
    "Content-Type": "multipart/form-data",
  })
    .then((res) => res.json())
    .then((d) => {
      document.getElementById("result_char").innerText = d["predicted_class"];
    })
    .catch((err) => console.log({ err }));
}
