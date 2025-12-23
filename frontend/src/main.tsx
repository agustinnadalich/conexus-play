import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import './index.css'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './utils/chartConfig'; // Configuración de Chart.js
import { AuthProvider } from './context/AuthContext';
import { ClubProvider } from './context/ClubContext';


const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ClubProvider>
            <App />
          </ClubProvider>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  </QueryClientProvider>

);
