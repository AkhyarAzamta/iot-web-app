"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Calendar, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Import the server action and store
import { getSensorData, type SensorData, type SensorDataFilters } from "@/actions/get-sensor-data"
import { useStoreDevice } from "@/hooks/use-store-modal" // Add this import

export const columns: ColumnDef<SensorData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   accessorKey: "deviceId",
  //   header: "Device ID",
  //   cell: ({ row }) => (
  //     <div className="font-mono text-sm">{row.getValue("deviceId")}</div>
  //   ),
  // },
    {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      const formatted = new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date)
      return <div className="text-sm">{formatted}</div>
    },
  },
  {
    accessorKey: "temperature",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Temperature (°C)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const temp = parseFloat(row.getValue("temperature"))
      return <div className="text-center font-medium">{temp.toFixed(2)}</div>
    },
  },
  {
    accessorKey: "turbidity",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Turbidity (NTU)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const turbidity = parseFloat(row.getValue("turbidity"))
      return <div className="text-center font-medium">{turbidity.toFixed(4)}</div>
    },
  },
  {
    accessorKey: "tds",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          TDS (ppm)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const tds = parseFloat(row.getValue("tds"))
      return <div className="text-center font-medium">{tds}</div>
    },
  },
  {
    accessorKey: "ph",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          pH
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const ph = parseFloat(row.getValue("ph"))
      return <div className="text-center font-medium">{ph.toFixed(2)}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const sensorData = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(sensorData.id.toString())}
            >
              Copy sensor ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(sensorData.deviceId)}
            >
              Copy device ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete data</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function SensorDataTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  
  // Get active device from store
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  
  // State for data and loading
  const [data, setData] = React.useState<SensorData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: 0
  })
  
  // State for filters
  const [timeFilter, setTimeFilter] = React.useState<string>("")
  const [dateFrom, setDateFrom] = React.useState<string>("")
  const [dateTo, setDateTo] = React.useState<string>("")

  // Function to fetch data using server action
  const fetchSensorData = React.useCallback(async () => {
    // Don't fetch if no active device is selected
    if (!activeDevice?.id) {
      setLoading(false)
      setData([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const filters: SensorDataFilters = {
        page: pagination.page,
        page_size: pagination.pageSize,
        device_id: activeDevice.id, // Add device ID filter
      }
      
      if (timeFilter) filters.time_filter = timeFilter
      if (dateFrom) filters.date_from = dateFrom
      if (dateTo) filters.date_to = dateTo
      
      const result = await getSensorData(filters)
      
      setData(result.data)
      setPagination(prev => ({
        ...prev,
        totalPages: result.paging.total_page,
        totalItems: result.paging.total_item
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sensor data'
      console.error('Error fetching sensor data:', errorMessage)
      setError(errorMessage)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeDevice?.id, pagination.page, pagination.pageSize, timeFilter, dateFrom, dateTo])

  // Fetch data when component mounts or filters change
  React.useEffect(() => {
    fetchSensorData()
  }, [fetchSensorData])

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [timeFilter, dateFrom, dateTo])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true, // Server-side pagination
    pageCount: pagination.totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      }
    },
  })

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value)
    if (value) {
      // Clear custom date range when using predefined filters
      setDateFrom("")
      setDateTo("")
    }
  }

  const handleDateRangeFilter = () => {
    if (dateFrom || dateTo) {
      setTimeFilter("") // Clear predefined filter when using custom date range
    }
  }

  const clearFilters = () => {
    setTimeFilter("")
    setDateFrom("")
    setDateTo("")
  }

  const handleRefresh = () => {
    fetchSensorData()
  }

  return (
    <div className="w-full space-y-4 px-4">
      {/* Device Info */}
      {activeDevice && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm font-medium">
            Showing data for: {activeDevice.deviceName} ({activeDevice.id})
          </p>
        </div>
      )}

      {!activeDevice && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            Please select a device to view sensor data.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">Error: {error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        
        {/* Time Filter Dropdown */}
        <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Hari ini</SelectItem>
            <SelectItem value="week">7 hari terakhir</SelectItem>
            <SelectItem value="month">30 hari terakhir</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm">atau</span>
        </div>

        {/* Custom Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Input
            type="date"
            placeholder="Dari tanggal"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onBlur={handleDateRangeFilter}
            className="w-[150px]"
          />
          <span className="text-sm">sampai</span>
          <Input
            type="date"
            placeholder="Sampai tanggal"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onBlur={handleDateRangeFilter}
            className="w-[150px]"
          />
        </div>

        <Button variant="outline" onClick={clearFilters}>
          Clear Filter
        </Button>

        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      {/* </div> */}

      {/* Table Controls */}
      {/* <div className="flex items-center justify-between"> */}
        {/* <Input
          placeholder="Filter device ID..."
          value={(table.getColumn("deviceId")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("deviceId")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        /> */}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {activeDevice ? "Loading sensor data..." : "No device selected"}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {activeDevice ? "No sensor data found for this device." : "Please select a device to view data."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              setPagination(prev => ({ ...prev, pageSize: Number(value), page: 1 }))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {pagination.totalItems} row(s) selected.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
              disabled={pagination.page === 1 || loading}
            >
              <span className="sr-only">Go to first page</span>
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1 || loading}
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              <span className="sr-only">Go to next page</span>
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.totalPages }))}
              disabled={pagination.page === pagination.totalPages || loading}
            >
              <span className="sr-only">Go to last page</span>
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}