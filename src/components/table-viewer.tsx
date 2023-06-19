import React from 'react';
import data from '../mock-data/sampleocr.json';
import _ from 'lodash';

interface ITableState {
    headers: any[],
    body: any[],
    maxRows : number
}

interface IRow {
    rowIndex: number,
    colIndex: number
    items: any
}
class TableViewer extends React.Component<null, ITableState> {

    constructor(props: any) {
        super(props);
        // Parse JSON data into a JavaScript object
        this.state = { headers: [], body: [], maxRows : 0 };
    }

    public componentDidMount() {
        this.loadData();
    }

    loadData = () => {
        const datas = data.analyzeResult.tables[2];
        this.setState({ headers: _.filter(datas.cells, (e) => { return e.kind === "columnHeader" }) });
        console.log(_.filter(datas.cells, (e) => { return e.kind === "columnHeader" }));
        const filteredBody = _.filter(datas.cells, (e) => { return e.kind === undefined });
        this.transformBody(filteredBody, datas.rowCount, datas.columnCount);
    }

    transformBody = (filteredBody: any[], _rowCount: number, columnCount: number) => {
        const allRows: IRow[] = [];
        for (let i = 0; i < columnCount; i++) {
            const currentColumnItems = _.filter(filteredBody, (x) => { return x.columnIndex === i });
            console.log(currentColumnItems);
            for (const item of currentColumnItems) {
                const row: IRow = { rowIndex: item.rowIndex, colIndex: item.columnIndex, items: item };
                allRows.push(row);                
            }
        }
        this.setState({ body: allRows });
        this.setState({ maxRows: Math.max(...allRows.map(o => o.rowIndex), 0) });
        
        console.log(Math.max(...allRows.map(o => o.rowIndex), 0));
        console.log(this.state.maxRows);
        //console.log(_.find(allRows, { 'rowIndex': 2, 'colIndex': 10 }));
    }

    render() {
        return (
            <div>                
                {
                    <table>                        
                        {
                            <tr>
                                {
                                    this.state.headers.map((header, index) => (
                                        <th key={index} colSpan={header.columnSpan}>{header?.content}</th>
                                    ))
                                }
                            </tr>
                        }
                        {[...Array(this.state.maxRows)].map((_y, i) =>
                            <tr key={i}>
                            {
                                this.state.body.filter(x=>x.rowIndex == i).map((body) => (
                                    <td key={`${i}.${body.items.columnIndex}.${body.items.rowIndex}`} colSpan={body.items.columnSpan} rowSpan={body.items.rowSpan}>
                                        {body.items.content}
                                    </td>
                                ))
                            }
                            </tr>
                        )}
                    </table>
                }
            </div>
        )
    }
}

export default TableViewer;