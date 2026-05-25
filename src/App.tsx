import { BrowserRouter, Routes, Route } from "react-router-dom";
import Book from "./Pages/Book";
import Dashboard from "./Pages/Dashboard";
import TrackTurn from "./Pages/TrackTurn";
import Login from "./Pages/Login";
import Home from "./Pages/Home";
import TrackSearch from "./Pages/TrackSearch";




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/book" element={<Book />} />
        <Route path="/book/:userId" element={<Book />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/track-search" element={<TrackSearch />} />
        <Route path="/track/:turn" element={<TrackTurn />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;