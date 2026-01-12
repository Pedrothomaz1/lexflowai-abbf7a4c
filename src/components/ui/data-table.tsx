import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";
import { TableSkeleton } from "./skeleton-loaders";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { useState, useMemo } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface Column<T> extends DataTableColumn<T> {}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyState?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRowClick?: (item: T) => void;
  className?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading,
  emptyState,
  onRowClick,
  className,
  pagination,
  searchable,
  searchPlaceholder = "Buscar...",
  searchKey,
  rowClassName,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery) return data;
    
    return data.filter((item) => {
      if (searchKey) {
        const value = (item as any)[searchKey];
        return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      }
      // Search across all string values
      return Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [data, searchQuery, searchable, searchKey]);

  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="card-elevated">
        <EmptyState
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0;

  const renderCellContent = (column: DataTableColumn<T>, item: T) => {
    if (column.render) {
      return column.render((item as any)[column.key], item);
    }
    if (column.cell) {
      return column.cell(item);
    }
    return (item as any)[column.key];
  };

  return (
    <div className={cn("overflow-hidden", className)}>
      {searchable && (
        <div className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "table-row-hover transition-colors",
                    index % 2 === 1 && "bg-muted/20",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(item)
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn("text-sm", column.className)}
                    >
                      {renderCellContent(column, item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            a{" "}
            <span className="font-medium text-foreground">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            de{" "}
            <span className="font-medium text-foreground">{pagination.total}</span>{" "}
            resultados
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
