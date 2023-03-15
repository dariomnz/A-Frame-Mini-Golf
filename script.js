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

function toggleLevelDropdown() {
  dropdown = document.getElementsByClassName("dropdown-content")[0];
  console.log(dropdown);
  if (dropdown.style.display != "flex") {
    dropdown.style.display = "flex";
  } else {
    dropdown.style.display = "none";
  }
}

actual_level = "#level1_model";
function nextLevel() {
  var next_level = "";
  switch (actual_level) {
    case "#level1_model":
      next_level = "#level2_model";
      break;
    case "#level2_model":
      next_level = "#level3_model";
      break;
    case "#level3_model":
      next_level = "#level1_model";
      break;
    default:
      break;
  }

  changeLevel(next_level);
}

canChangeLevel = true;

async function changeLevel(levelname) {
  if (!canChangeLevel) return;
  canChangeLevel = false;
  console.log("Changing level to: ", levelname);
  dropdown = document.getElementsByClassName("dropdown-content")[0];
  dropdown.style.display = "none";

  actual_level = levelname;

  level = document.getElementById("level");
  level.removeAttribute("ammo-shape");
  level.removeAttribute("ammo-body");
  level.removeAttribute("gltf-model");
  await new Promise((r) => setTimeout(r, 100));
  level.setAttribute("gltf-model", levelname.toString());

  var position = "0 0 0";
  switch (levelname) {
    case "#level1_model":
      position = "0 -5 -12.2";
      break;
    case "#level2_model":
      position = "-9. -3.5 -5.8";
      break;
    case "#level3_model":
      position = "-6.6 -3 -32.5";
      break;
    default:
      break;
  }

  resetAmmo("hole_hitbox");
  flag = document.getElementById("flag");
  flag.setAttribute("position", position);

  await new Promise((r) => setTimeout(r, 200));
  await onResetScene();
  canChangeLevel = true;
}

async function resetAmmo(id) {
  entity = document.getElementById(id);
  entity_ammo_body = entity.getAttribute("ammo-body");
  entity_ammo_shape = entity.getAttribute("ammo-shape");
  entity.removeAttribute("ammo-shape");
  entity.removeAttribute("ammo-body");
  await new Promise((r) => setTimeout(r, 100));
  entity.setAttribute("ammo-body", entity_ammo_body);
  entity.setAttribute("ammo-shape", entity_ammo_shape);
}

canReset = true;

async function onResetScene() {
  if (!canReset) return;
  canReset = false;
  setToques(0);
  win_popup = document.getElementById("win_popup");
  camera = document.getElementById("camera");
  ball = document.getElementById("ball");
  ball_hitbox = document.getElementById("ball_hitbox");
  win_popup.style.visibility = "hidden";
  promise1 = resetAmmo("ball_hitbox");
  await new Promise((r) => setTimeout(r, 100));
  promise2 = resetAmmo("ball");
  ball.setAttribute("position", "0 0 -1");
  await new Promise((r) => setTimeout(r, 100));
  promise3 = resetAmmo("wedge_rod");
  await new Promise((r) => setTimeout(r, 100));
  promise4 = resetAmmo("wedge_head");
  camera.setAttribute("position", "0 0 0");
  camera.setAttribute("rotation", "0 0 0");
  await promise1;
  await promise2;
  await promise3;
  await promise4;
  canReset = true;
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
      if (id == "wedge_head" || id == "wedge_rod") {
        window.navigator.vibrate(200);
        setToques(getToques() + 1);
      }
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

    reset_plane.addEventListener("collidestart", onResetScene);

    document.getElementById("controls-panel").style.display = "flex";
    if (document.getElementById("btn-jugar").classList.contains("a-hidden")) {
      document.getElementById("error-no-ar").style.display = "block";
    }
  },

  onEnterXR: function () {
    document.getElementById("controls-panel").style.display = "none";
    document.getElementById("header").style.display = "flex";

    console.log(document.getElementById("header").style);
    if (!this.el.sceneEl.is("ar-mode")) return;

    this.session = this.el.sceneEl.renderer.xr.getSession();
    this.session.addEventListener("selectend", this.onSelectEnd);
    this.session.addEventListener("selectstart", this.onSelectStart);

    changeLevel("#level1_model");
  },

  onExitXR: function () {
    document.getElementById("controls-panel").style.display = "flex";
    document.getElementById("header").style.display = "none";
  },

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
