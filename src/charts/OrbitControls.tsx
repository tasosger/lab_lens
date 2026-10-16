import { DEFAULT_ORBIT_CAMERA, MAX_PITCH, MAX_ZOOM, MIN_ZOOM, normalizeCamera, type OrbitCamera } from './projection3D'

export function OrbitControls({ camera, onChange }: { camera: OrbitCamera; onChange: (camera: OrbitCamera) => void }) {
  return (
    <div className="orbit-controls" role="group" aria-label="3D view controls">
      <label>Rotation <output>{Math.round(camera.yaw)}°</output>
        <input type="range" min={-180} max={180} step={1} value={camera.yaw} aria-label="3D rotation" aria-valuetext={`${Math.round(camera.yaw)} degrees`} onChange={(event) => onChange(normalizeCamera({ ...camera, yaw: Number(event.target.value) }))} />
      </label>
      <label>Tilt <output>{Math.round(camera.pitch)}°</output>
        <input type="range" min={-MAX_PITCH} max={MAX_PITCH} step={1} value={camera.pitch} aria-label="3D tilt" aria-valuetext={`${Math.round(camera.pitch)} degrees`} onChange={(event) => onChange(normalizeCamera({ ...camera, pitch: Number(event.target.value) }))} />
      </label>
      <label>Zoom <output>{Math.round(camera.zoom * 100)}%</output>
        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05} value={camera.zoom} aria-label="3D zoom" aria-valuetext={`${Math.round(camera.zoom * 100)} percent`} onChange={(event) => onChange(normalizeCamera({ ...camera, zoom: Number(event.target.value) }))} />
      </label>
      <button className="button" onClick={() => onChange(DEFAULT_ORBIT_CAMERA)}>Reset view</button>
    </div>
  )
}
