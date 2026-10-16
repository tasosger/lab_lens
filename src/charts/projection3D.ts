import { linearScale } from './numericScale.ts'
import type { ChartPosition, NumericDomain, ScatterPoint } from './types.ts'

export interface ScatterPoint3D extends ScatterPoint { readonly z: number }
export type Vector3 = readonly [number, number, number]
export interface OrbitCamera {
  readonly yaw: number
  readonly pitch: number
  readonly zoom: number
  /** Screen offset as a fraction of the viewport, so resizing preserves the view. */
  readonly pan?: readonly [number, number]
}
export const DEFAULT_ORBIT_CAMERA: OrbitCamera = Object.freeze({ yaw: 35, pitch: 25, zoom: 1 })
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 6
export const MAX_PITCH = 75

export function normalizeCamera(camera: OrbitCamera): OrbitCamera {
  const yaw = Number.isFinite(camera.yaw) ? camera.yaw : DEFAULT_ORBIT_CAMERA.yaw
  return {
    yaw: ((yaw + 180) % 360 + 360) % 360 - 180,
    pitch: Number.isFinite(camera.pitch) ? Math.max(-MAX_PITCH, Math.min(MAX_PITCH, camera.pitch)) : DEFAULT_ORBIT_CAMERA.pitch,
    zoom: Number.isFinite(camera.zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom)) : DEFAULT_ORBIT_CAMERA.zoom,
    ...(camera.pan ? { pan: camera.pan.map(value => Number.isFinite(value) ? Math.max(-MAX_ZOOM, Math.min(MAX_ZOOM, value)) : 0) as [number, number] } : {}),
  }
}

export function cameraAfterDrag(camera: OrbitCamera, dx: number, dy: number): OrbitCamera {
  return normalizeCamera({ ...camera, yaw: camera.yaw + dx * 0.5, pitch: camera.pitch + dy * 0.4 })
}

/** Keep the projected position under the pointer fixed while changing scale. */
export function cameraAtZoom(camera: OrbitCamera, zoom: number, anchor: ChartPosition = { x: 0, y: 0 }): OrbitCamera {
  const next = normalizeCamera({ ...camera, zoom })
  if (next.zoom === camera.zoom) return camera
  const ratio = next.zoom / camera.zoom
  const x = Number.isFinite(anchor.x) ? anchor.x : 0
  const y = Number.isFinite(anchor.y) ? anchor.y : 0
  if (!camera.pan && x === 0 && y === 0) return next
  return normalizeCamera({ ...next, pan: [x - (x - (camera.pan?.[0] ?? 0)) * ratio, y - (y - (camera.pan?.[1] ?? 0)) * ratio] })
}

/** Normalize wheel units; trackpad pinch uses smaller deltas than ordinary scrolling. */
export function cameraAfterWheel(camera: OrbitCamera, deltaY: number, deltaMode = 0, anchor?: ChartPosition, pinch = false): OrbitCamera {
  if (!Number.isFinite(deltaY) || deltaY === 0) return camera
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1) * (pinch ? 4 : 1)
  const delta = Math.max(-120, Math.min(120, pixels))
  return cameraAtZoom(camera, camera.zoom * Math.exp(-delta * 0.0015), anchor)
}

export function cameraAfterPan(camera: OrbitCamera, dx: number, dy: number): OrbitCamera {
  return normalizeCamera({ ...camera, pan: [(camera.pan?.[0] ?? 0) + dx, (camera.pan?.[1] ?? 0) + dy] })
}

/** Interpolate scale and translation together so the zoom anchor stays stationary. */
export function interpolateZoomCamera(from: OrbitCamera, to: OrbitCamera, progress: number): OrbitCamera {
  if (progress >= 1) return to
  if (progress <= 0) return from
  const mix = (a: number, b: number) => a + (b - a) * progress
  return {
    ...from,
    zoom: mix(from.zoom, to.zoom),
    ...(from.pan || to.pan ? { pan: [mix(from.pan?.[0] ?? 0, to.pan?.[0] ?? 0), mix(from.pan?.[1] ?? 0, to.pan?.[1] ?? 0)] as const } : {}),
  }
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
  return { x: width / 2 + (camera.pan?.[0] ?? 0) * width + horizontal * scale, y: height / 2 + (camera.pan?.[1] ?? 0) * height - vertical * scale, depth }
}

/** Normalize each property's range independently before rotating the cube. */
export function create3DProjector(domains: readonly [NumericDomain, NumericDomain, NumericDomain], camera: OrbitCamera, width: number, height: number) {
  const scales = domains.map((domain) => linearScale(domain, [-1, 1]))
  return ([x, y, z]: Vector3) => projectUnit3D([scales[0]!(x), scales[1]!(y), scales[2]!(z)], camera, width, height)
}
