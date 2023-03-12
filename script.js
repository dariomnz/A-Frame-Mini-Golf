/* global AFRAME, THREE, Ammo */

// para saber los metodos
function getMethods(obj) {
  var res = [];
  for (var m in obj) {
    if (typeof obj[m] == "function") {
      res.push(m);
    }
  }
  return res;
}

function setToques(value) {
  document.getElementById("num_toques").innerHTML = value.toString();
}
function getToques() {
  return parseInt(document.getElementById("num_toques").innerHTML);
}

function changeLevel(levelname) {
  console.log("Changing level to: ", levelname);

  level = document.getElementById("level");
  level.removeAttribute("ammo-shape");
  level.removeAttribute("ammo-body");
  level.removeAttribute("gltf-model");
  level.setAttribute("gltf-model", levelname.toString());

  var position = "0 0 0";
  switch (levelname) {
    case "#level1_model":
      position = "0 -2.7 -12.2";
      break;
    case "#level2_model":
      position = "-9.15 -1.25 -5.8";
      break;
    case "#level3_model":
      position = "-6.6 -0.6 -32.5";
      break;
    default:
      break;
  }

  hole_hitbox = document.getElementById("hole_hitbox");
  hole_hitbox.setAttribute("position", position);
  hole_hitbox.components["ammo-body"].syncToPhysics()
  onResetScene();
}

function onResetScene() {
  win_popup = document.getElementById("win_popup");
  camera = document.getElementById("camera");
  ball = document.getElementById("ball");
  win_popup.style.visibility = "hidden";
  camera.setAttribute("position", "0 0 0");
  camera.setAttribute("rotation", "0 0 0");

  const transform = new Ammo.btTransform();
  ball.body.getMotionState().getWorldTransform(transform);
  const positionVec = new Ammo.btVector3(0, 0, -1);
  transform.setOrigin(positionVec);
  ball.body.getMotionState().setWorldTransform(transform);
  ball.body.setCenterOfMassTransform(transform);
  ball.body.activate();
  Ammo.destroy(transform);
  Ammo.destroy(positionVec);

  const velocity = new Ammo.btVector3(0, 0, 0);
  const angularVelocity = new Ammo.btVector3(0, 0, 0);
  ball.body.setLinearVelocity(velocity);
  ball.body.setAngularVelocity(angularVelocity);
  Ammo.destroy(velocity);
  Ammo.destroy(angularVelocity);

  setToques(0);
}

AFRAME.registerComponent("ammo-restitution", {
  schema: { default: 0.5 },
  init: function () {
    const el = this.el;
    const restitution = this.data;
    if (el.body) {
      el.body.setRestitution(restitution);
    } else {
      el.addEventListener("body-loaded", function () {
        el.body.setRestitution(restitution);
      });
    }
  },
});

AFRAME.registerComponent("autofit-gltf-ammo", {
  init: function () {
    const el = this.el;
    this.el.addEventListener("model-loaded", () => {
      el.setAttribute("ammo-body", "type:static;");
      el.setAttribute("ammo-shape", "type:mesh");
    });
  },
});

AFRAME.registerComponent("delay-scale", {
  schema: { default: "1 1 1" },
  init: function () {
    const el = this.el;
    this.el.addEventListener("body-loaded", async () => {
      await new Promise((r) => setTimeout(r, 100));
      el.setAttribute("scale", this.data);
    });
  },
});

AFRAME.registerComponent("hole-collision", {
  schema: {
    win_popup: {
      default: "#win_popup",
      type: "selector",
    },
  },
  init: function () {
    var audio = new Audio("sounds/winner.mp3");
    this.el.addEventListener("collidestart", (e) => {
      id = e.detail?.targetEl?.id;
      console.log(this.data.win_popup);
      if (id == "ball_hitbox") {
        this.data.win_popup.style.visibility = "visible";
        audio.play();
      }
    });
  },
});

AFRAME.registerComponent("ball-collision", {
  init: function () {
    this.el.addEventListener("collidestart", (e) => {
      id = e.detail?.targetEl?.id;
      console.log("Colision ", id);
      if (id == "wedge_head" || id == "wedge_rod")
        window.navigator.vibrate(200);
      setToques(getToques() + 1);
    });
  },
});

AFRAME.registerComponent("golf-game", {
  schema: {
    camera: {
      default: "#camera",
      type: "selector",
    },
    camera_preview: {
      default: "#camera_preview",
      type: "selector",
    },
    level: {
      default: "#level",
      type: "selector",
    },
    win_popup: {
      default: "#win_popup",
      type: "selector",
    },
    reset_plane: {
      default: "#reset_plane",
      type: "selector",
    },
  },

  init: function () {
    this.onEnterXR = this.onEnterXR.bind(this);
    this.onExitXR = this.onExitXR.bind(this);
    this.onSelectEnd = this.onSelectEnd.bind(this);
    this.onSelectStart = this.onSelectStart.bind(this);

    this.el.addEventListener("enter-vr", this.onEnterXR);
    this.el.addEventListener("exit-vr", this.onExitXR);

    this.rotate_left = false;
    this.rotate_right = false;

    reset_plane.addEventListener("collidestart", this.onResetScene);
  },

  onEnterXR: function () {
    if (!this.el.sceneEl.is("ar-mode")) return;

    this.session = this.el.sceneEl.renderer.xr.getSession();
    this.session.addEventListener("selectend", this.onSelectEnd);
    this.session.addEventListener("selectstart", this.onSelectStart);
  },

  onExitXR: function () {},

  onSelectEnd: function (e) {
    // Cuando sueltas click se mueve a la posicion y se hace invisible el puntero
    this.inputSource = null;
    if (this.camera_point) {
      this.data.camera.setAttribute("position", this.camera_point);
      this.data.camera_preview.setAttribute("visible", false);
    }

    this.rotate_left = false;
    this.rotate_right = false;
  },

  onSelectStart: function (e) {
    const position = new THREE.Vector2();
    const [x, y] = e.inputSource.gamepad.axes;
    position.x = x;
    position.y = -y;

    // si la posicion es en los bordes gira la camara
    if (x < -0.7) {
      this.rotate_left = true;
    } else if (x > 0.7) {
      this.rotate_right = true;
    } else {
      // sino cuando haces click se pone visible el puntero donde te moveras
      this.inputSource = e.inputSource;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(position, this.el.sceneEl.camera);

      const intersects = raycaster.intersectObject(
        this.data.level.object3D,
        true
      );

      if (intersects.length === 0) return;
      this.data.camera_preview.setAttribute("position", intersects[0].point);
      this.data.camera_preview.setAttribute("visible", true);
      this.camera_point = intersects[0].point;
    }
  },

  tick: function (time, timeDelta) {
    // Para cuando haces click cambiar de posicion
    if (this.inputSource) {
      const position = new THREE.Vector2();
      const raycaster = new THREE.Raycaster();
      const [x, y] = this.inputSource.gamepad.axes;
      position.x = x;
      position.y = -y;

      raycaster.setFromCamera(position, this.el.sceneEl.camera);

      const intersects = raycaster.intersectObject(
        this.data.level.object3D,
        true
      );

      if (intersects.length === 0) return;
      // console.log(intersects);
      this.data.camera_preview.setAttribute("position", intersects[0].point);
      this.camera_point = intersects[0].point;

      const rotation = this.data.camera_preview.getAttribute("rotation");
      rotation.y = (rotation.y + 100 * timeDelta * 0.001) % 360;
      this.data.camera_preview.setAttribute("rotation", rotation);
    }
    // cuando haces clicks para girar la camara
    if (this.rotate_left) {
      const rotation = this.data.camera.getAttribute("rotation");
      rotation.y = (rotation.y + 100 * timeDelta * 0.001) % 360;
      this.data.camera.setAttribute("rotation", rotation);
    }
    if (this.rotate_right) {
      const rotation = this.data.camera.getAttribute("rotation");
      rotation.y = (rotation.y - 100 * timeDelta * 0.001) % 360;
      this.data.camera.setAttribute("rotation", rotation);
    }
  },
});
