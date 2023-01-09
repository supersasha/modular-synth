import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import { useState } from 'react';
import { rackControl } from './rack-control';
import { Plot } from './Plot';

const Hello = () => {
  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="folded hands">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div>
    </div>
  );
};

function OScope(props: any) {
    const { name } = props;
    const [state, setState] = useState({ xs: [0, 1], ys: [0, 1] });
    setTimeout(async () => {
        const resp = await rackControl.module(name);
        setState(resp);
    }, 100);

    return (
        <div>
            <Plot
                containerStyle={{ width: '1000px', height: '600px'}}
                xmarkFormat=":3"
                yrange={[-1, 1]}
                plots={[
                    state,
                ]}
            />
        </div>
    );
}

function Rack() {
    return (
        <>
            <div>
                <button onClick={ () => {rackControl.start()} }>start</button>
                <button onClick={ () => {rackControl.pause()} }>pause</button>
                <button onClick={ () => {rackControl.resume()} }>resume</button>
                <button onClick={ () => {rackControl.stop()} }>stop</button>
            </div>
            <OScope name="oscope1"/>
        </>
    );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Rack />} />
      </Routes>
    </Router>
  );
}
