/* global AFRAME, THREE, Ammo */
// TODO: hacer vibracion cuando das a la pelota y posible sonido

const tempVector = new THREE.Vector3();

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

function positionAmmoBody(body, p) {
  const transform = new Ammo.btTransform();
  body.getMotionState().getWorldTransform(transform);

  const positionVec = new Ammo.btVector3(p.x, p.y, p.z);

  transform.setOrigin(positionVec);
  body.getMotionState().setWorldTransform(transform);
  body.setCenterOfMassTransform(transform);
  body.activate();

  // Clean up
  Ammo.destroy(transform);
  Ammo.destroy(positionVec);
}

AFRAME.registerComponent("golf-game", {
  schema: {
    wedge: {
      default: "#wedge",
      type: "selector",
    },
    ball: {
      default: "#ball",
      type: "selector",
    },
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
    launchVelocity: {
      default: 5,
    },
  },

  init: function () {
    this.onEnterXR = this.onEnterXR.bind(this);
    this.onExitXR = this.onExitXR.bind(this);
    this.onSelectEnd = this.onSelectEnd.bind(this);
    this.onSelectStart = this.onSelectStart.bind(this);
    this.onSelect = this.onSelect.bind(this);

    this.el.addEventListener("enter-vr", this.onEnterXR);
    this.el.addEventListener("exit-vr", this.onExitXR);

    this.rotate_left = false;
    this.rotate_right = false;
  },

  onEnterXR: function () {
    if (!this.el.sceneEl.is("ar-mode")) return;

    this.session = this.el.sceneEl.renderer.xr.getSession();
    this.session.addEventListener("selectend", this.onSelectEnd);
    this.session.addEventListener("selectstart", this.onSelectStart);
    this.session.addEventListener("select", this.onSelect);
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

  onSelect: function (e) {},

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

    console.log("izquierda", this.rotate_left);
    console.log("derecha", this.rotate_right);
  },
});
