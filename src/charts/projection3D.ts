import { linearScale } from './numericScale.ts'
import type { NumericDomain, ScatterPoint } from './types.ts'

export interface ScatterPoint3D extends ScatterPoint { readonly z: number }
export type Vector3 = readonly [number, number, number]
export interface OrbitCamera { readonly yaw: number; readonly pitch: number; readonly zoom: number }
export const DEFAULT_ORBIT_CAMERA: OrbitCamera = Object.freeze({ yaw: 35, pitch: 25, zoom: 1 })
export const MIN_ZOOM = 0.6
export const MAX_ZOOM = 1.4
export const MAX_PITCH = 75

export function normalizeCamera(camera: OrbitCamera): OrbitCamera {
  const yaw = Number.isFinite(camera.yaw) ? camera.yaw : DEFAULT_ORBIT_CAMERA.yaw
  return {
    yaw: ((yaw + 180) % 360 + 360) % 360 - 180,
    pitch: Number.isFinite(camera.pitch) ? Math.max(-MAX_PITCH, Math.min(MAX_PITCH, camera.pitch)) : DEFAULT_ORBIT_CAMERA.pitch,
    zoom: Number.isFinite(camera.zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom)) : DEFAULT_ORBIT_CAMERA.zoom,
  }
}

export function cameraAfterDrag(camera: OrbitCamera, dx: number, dy: number): OrbitCamera {
  return normalizeCamera({ ...camera, yaw: camera.yaw + dx * 0.5, pitch: camera.pitch + dy * 0.4 })
}

/** Normalize pixel, line, and page wheel deltas and bound unusually large scroll steps. */
export function cameraAfterWheel(camera: OrbitCamera, deltaY: number, deltaMode = 0): OrbitCamera {
  if (!Number.isFinite(deltaY) || deltaY === 0) return camera
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1)
  const delta = Math.max(-240, Math.min(240, pixels))
  return normalizeCamera({ ...camera, zoom: camera.zoom * Math.exp(-delta * 0.0015) })
}

export function isRotationDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= 4
}

/** Orthographic projection. Positive depth is nearer the viewer. Z is vertical. */
export function projectUnit3D([x, y, z]: Vector3, camera: OrbitCamera, width: number, height: number) {
  const yaw = camera.yaw * Math.PI / 180
  const pitch = camera.pitch * Math.PI / 180
  const horizontal = x * Math.cos(yaw) - y * Math.sin(yaw)
  const forward = x * Math.sin(yaw) + y * Math.cos(yaw)
  const vertical = z * Math.cos(pitch) - forward * Math.sin(pitch)
  const depth = z * Math.sin(pitch) + forward * Math.cos(pitch)
  const scale = Math.min(width, height) * 0.23 * camera.zoom
  return { x: width / 2 + horizontal * scale, y: height / 2 - vertical * scale, depth }
}

/** Normalize each property's range independently before rotating the cube. */
export function create3DProjector(domains: readonly [NumericDomain, NumericDomain, NumericDomain], camera: OrbitCamera, width: number, height: number) {
  const scales = domains.map((domain) => linearScale(domain, [-1, 1]))
  return ([x, y, z]: Vector3) => projectUnit3D([scales[0]!(x), scales[1]!(y), scales[2]!(z)], camera, width, height)
}
