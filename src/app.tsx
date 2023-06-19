import "./styles.css"
import DocumentViewer from "./DocumentViewer";
import { Route, Routes } from "react-router-dom";

import TableViewer from "./components/table-viewer";

export const App = ()=>{
    return (
        <Routes>
            <Route path="/" element={<TableViewer/>}></Route>
            <Route path="doc" element={<DocumentViewer canvasWidth={720} canvasHeight={1440}/>}></Route>
        </Routes>
    );
}