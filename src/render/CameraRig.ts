import * as THREE from 'three';
import { CAMERA as C } from '../data/runner';
import { RENDER } from '../data/render';
import { SPEED } from '../data/runner';

/** Behind-and-above chase camera with lateral lag, speed FOV, FOV kick spring and micro shake. */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(C.fov, 1, RENDER.near, RENDER.far);
  private x = 0;
  private y = 0;
  private kick = 0;
  private kickV = 0;
  private shake = 0;
  private t = 0;
  private fly = 0;
  private readonly look = new THREE.Vector3();

  /** Adds an FOV punch (degrees of velocity). */
  addKick(amount: number): void {
    this.kickV += amount * C.fovKickStiffness * 0.1;
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  update(dt: number, targetX: number, targetY: number, speed: number, flying = false): void {
    this.t += dt;
    this.x += (targetX - this.x) * (1 - Math.exp(-C.xRate * dt));
    this.y += (targetY - this.y) * (1 - Math.exp(-C.yRate * dt));

    this.kickV += (-C.fovKickStiffness * this.kick - C.fovKickDamping * this.kickV) * dt;
    this.kick += this.kickV * dt;
    this.shake *= Math.exp(-C.shakeDecay * dt);
    const sx = this.shake * Math.sin(this.t * C.shakeFreq);
    const sy = this.shake * Math.cos(this.t * C.shakeFreq * 1.3);

    const cam = this.camera;
    this.fly += ((flying ? 1 : 0) - this.fly) * (1 - Math.exp(-3 * dt));
    const fy = C.followY + (C.flyFollowY - C.followY) * this.fly;
    const ly = C.lookY + (C.flyLookY - C.lookY) * this.fly;
    cam.position.set(C.offset[0] + this.x * C.followX + sx, C.offset[1] + this.y * fy + sy, C.offset[2]);
    this.look.set(C.lookAt[0] + this.x * C.lookX, C.lookAt[1] + this.y * ly, C.lookAt[2]);
    cam.lookAt(this.look);

    const norm = Math.max(0, (speed - SPEED.start) / (SPEED.hardCap - SPEED.start));
    const fov = C.fov + C.speedFov * norm + this.kick;
    if (Math.abs(fov - cam.fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
