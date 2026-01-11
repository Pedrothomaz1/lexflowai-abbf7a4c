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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
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
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading,
  emptyState,
  onRowClick,
  className,
  pagination,
}: DataTableProps<T>) {
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

  return (
    <div className={cn("card-elevated overflow-hidden", className)}>
      <div className="overflow-x-auto scrollbar-thin">
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
            {data.map((item, index) => (
              <TableRow
                key={item.id}
                className={cn(
                  "table-row-hover",
                  index % 2 === 1 && "bg-muted/20",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn("text-sm", column.className)}
                  >
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
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
