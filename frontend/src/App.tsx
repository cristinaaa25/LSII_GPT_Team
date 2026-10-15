import './App.css';
import VideoCatalog from './components/VideoCatalog';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src="/protube-logo-removebg-preview.png" className="App-logo" alt="ProTube logo" />
      </header>
      <main className="container py-4">
        <VideoCatalog />
      </main>
    </div>
  );
}

export default App;
