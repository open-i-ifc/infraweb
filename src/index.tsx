import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { IFCViewer, ViewerProvider } from './react-components/ifcViewer';
import * as Router from "react-router-dom"


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);




root.render(
  <>
    <Router.BrowserRouter>
      <ViewerProvider>
      
      <Router.Routes>
        <Router.Route path="/ifc" element={<IFCViewer />}></Router.Route>
        <Router.Route path="/" element={<IFCViewer />}></Router.Route>
        <Router.Route path="/infraweb" element={<IFCViewer />}></Router.Route>

      </Router.Routes>
      </ViewerProvider>
    </Router.BrowserRouter>
  </>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
