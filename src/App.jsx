import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// ── Hooks métier (remplacent les useEffect inline) ────
import { useGameClock }    from "./hooks/useGameClock";
import { useSpawner }      from "./hooks/useSpawner";
import { useExpiry }       from "./hooks/useExpiry";
import { useSalary }       from "./hooks/useSalary";
import { useDeliveries }   from "./hooks/useDeliveries";
import { useEvents }       from "./hooks/useEvents";
import { useServerMoral }  from "./hooks/useServerMoral";
import { useChallenges }   from "./hooks/useChallenges";
import { useObjectives }   from "./hooks/useObjectives";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
