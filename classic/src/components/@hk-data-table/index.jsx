import React from 'react';
import PropTypes from 'prop-types';
import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import classNames from 'classnames';
import { Form, Table } from 'react-bootstrap';
import { Star } from 'react-feather';
import { ArrowsSort, SortAscending, SortDescending } from 'tabler-icons-react';
import TableFooter from './TableFooter';

const HkDataTable = ({
    column,
    rowData,
    bsPrefix,
    classes,
    striped,
    bordered,
    borderless,
    hover,
    size,
    variant,
    responsive,
    rowsPerPage,
    paginatorSize,
    rowSelection,
    searchBar,
    searchQuery,
    searchClasses,
    markStarred,
    ...rest
}) => {

    const [data, setData] = React.useState(rowData);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sorting, setSorting] = React.useState([]);
    const [rowSelectionState, setRowSelectionState] = React.useState({});
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: rowsPerPage || rowData.length || 10,
    });

    const tableColumns = React.useMemo(() => column.map((cols) => ({
        id: cols.accessor,
        accessorFn: (row) => cols.sortValue ? cols.sortValue(row[cols.accessor], row) : row[cols.accessor],
        enableSorting: Boolean(cols.sort),
    })), [column]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        state: {
            sorting,
            globalFilter: searchTerm,
            pagination,
            rowSelection: rowSelectionState,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setSearchTerm,
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelectionState,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, _columnId, filterValue) => {
            const query = String(filterValue || '').toLowerCase();
            return Object.values(row.original).some((value) =>
                String(value ?? '').toLowerCase().includes(query)
            );
        },
    });

    //Search Filter
    React.useEffect(() => {
        setSearchTerm(searchQuery || '');
    }, [searchQuery])

    React.useEffect(() => {
        setData(rowData);
    }, [rowData]);

    React.useEffect(() => {
        setPagination((prev) => ({
            pageIndex: 0,
            pageSize: rowsPerPage || data.length || 10,
        }));
    }, [data.length, rowsPerPage, searchTerm]);

    const handleStared = (rowIndex) => {
        setData((prevData) => prevData.map((row, index) => index === rowIndex ? { ...row, starred: !row.starred } : row));
    }

    const currentPageRows = table.getRowModel().rows;
    const filteredRows = table.getFilteredRowModel().rows;
    const range = Array.from({ length: table.getPageCount() }, (_item, index) => index + 1);
    const page = pagination.pageIndex + 1;
    const sortedColumn = sorting[0];

    return (
        <>
            {(searchBar && !searchQuery) && <Form.Group controlId="searchForm" className="mb-3">
                <Form.Control
                    type="search"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={searchClasses}
                />
            </Form.Group>}
            <Table
                bsPrefix={bsPrefix}
                className={classNames("hk-data-table", classes)}
                striped={striped}
                bordered={bordered}
                borderless={borderless}
                hover={hover}
                size={size}
                variant={variant}
                responsive={responsive}
                {...rest}
            >
                <thead>
                    <tr>
                        {(rowSelection || markStarred) && <th>
                            {rowSelection ? <Form.Check
                                type="checkbox"
                                className="fs-6 mb-0"
                                checked={table.getIsAllPageRowsSelected()}
                                onChange={table.getToggleAllPageRowsSelectedHandler()}
                            />
                                :
                                <></>
                            }

                        </th>}
                        {column.map((cols, index) => (
                            <th
                                key={index}
                                onClick={cols.sort ? table.getColumn(cols.accessor)?.getToggleSortingHandler() : undefined}
                                className={classNames({ 'd-none': cols.hidden }, { "text-primary": sortedColumn?.id === cols.accessor }, cols.className)}
                                rowSpan={cols.rowSpan}
                            >
                                <span className="d-flex">
                                    <span className="flex-grow-1">
                                        {cols.title}
                                    </span>
                                    {
                                        cols.sort &&
                                        <span>
                                            {(sortedColumn?.id === cols.accessor)
                                                ?
                                                <>
                                                    {
                                                        (sortedColumn.desc === false)
                                                            ?
                                                            <font color="#007D88">
                                                                <SortAscending size={14} strokeWidth={2.5} />
                                                            </font>
                                                            :
                                                            <font color="#007D88">
                                                                <SortDescending size={14} strokeWidth={2.5} />
                                                            </font>
                                                    }
                                                </>
                                                :
                                                <span><ArrowsSort size={14} strokeWidth={2.5} /> </span>}
                                        </span>
                                    }
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {currentPageRows.map((row) => (
                        <tr key={row.id} className={classNames({ "selected": row.getIsSelected() })}>
                            {(rowSelection || markStarred) && <td>
                                <div className="d-flex align-items-center">
                                    {rowSelection && <Form.Check
                                        type="checkbox"
                                        className="form-check fs-6 mb-0"
                                        checked={row.getIsSelected()}
                                        onChange={row.getToggleSelectedHandler()}
                                    />}
                                    {markStarred && <span className={classNames("fav-star", { "marked": row.original.starred })} onClick={() => handleStared(row.index)} >
                                        <span className="feather-icon">
                                            <Star />
                                        </span>
                                    </span>}
                                </div>
                            </td>}
                            {column.map((cols, index) => (
                                <td
                                    key={index}
                                    className={classNames({ 'd-none': cols.hidden }, cols.tdClasses)}
                                >
                                    {
                                        cols.cellFormatter
                                            ?
                                            cols.cellFormatter(row.original[cols.accessor])
                                            :
                                            row.original[cols.accessor]
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table >
            {rowsPerPage && <TableFooter
                range={range}
                slice={currentPageRows}
                setPage={(nextPage) => table.setPageIndex(nextPage - 1)}
                page={page}
                totalRows={filteredRows}
                paginatorSize={paginatorSize}
            />}
        </>
    )
}

HkDataTable.propTypes = {
    column: PropTypes.array.isRequired,
    rowData: PropTypes.array.isRequired,
    bsPrefix: PropTypes.string,
    classes: PropTypes.string,
    striped: PropTypes.bool,
    bordered: PropTypes.bool,
    borderless: PropTypes.bool,
    hover: PropTypes.bool,
    size: PropTypes.string,
    variant: PropTypes.string,
    responsive: PropTypes.bool,
    rowsPerPage: PropTypes.number,
    paginatorSize: PropTypes.string,
    rowSelection: PropTypes.bool,
    searchBar: PropTypes.bool,
    searchQuery: PropTypes.string,
    searchClasses: PropTypes.string,
    markStarred: PropTypes.bool,
}

export default HkDataTable
