import { getExperimentRepository } from './data'
import { ExperimentWorkspace } from './features/experiments/ExperimentWorkspace'

export default function App() {
  try {
    const repository = getExperimentRepository()
    return <ExperimentWorkspace repository={repository} />
  } catch {
    return (
      <main className="load-error">
        <div className="brand-mark" aria-hidden="true">L</div>
        <h1>The experiments couldn’t be loaded.</h1>
        <p>The dataset contains an unexpected value or structure. Check the experiment JSON and reload the page.</p>
        <button className="button primary" onClick={() => window.location.reload()}>Reload dataset</button>
      </main>
    )
  }
}
