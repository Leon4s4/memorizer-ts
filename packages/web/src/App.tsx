import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Index } from './pages/Index';
import { Create } from './pages/Create';
import { Edit } from './pages/Edit';
import { View } from './pages/View';
import { Stats } from './pages/Stats';
import Search from './pages/Search';
import Admin from './pages/Admin';
import { Layout } from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="create" element={<Create />} />
          <Route path="search" element={<Search />} />
          <Route path="memories/:id" element={<View />} />
          <Route path="memories/:id/edit" element={<Edit />} />
          <Route path="stats" element={<Stats />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
