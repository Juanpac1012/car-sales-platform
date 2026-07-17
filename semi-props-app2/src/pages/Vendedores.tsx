import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, User, Phone, Mail, MoreVertical, Edit, Trash2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GetSalesPersons, CreateSalesPerson, UpdateSalesPerson, DeleteSalesPerson, SalesPerson } from "@/lib/VendedoresApi";
import { ensureAuth } from "@/lib/vendedoresAuth";
import { client } from "@/lib/api.customer/client";
import { getLocalUsers, type LocalUser } from "@/lib/AdminApi";

export default function Vendedores() {
  const { toast } = useToast();
  // ✅ Permisos CRM (SIN hasPermission) - igual que Clientes
const [permMap, setPermMap] = useState<Record<string, string>>({});
const [permLoaded, setPermLoaded] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem("current_role_perms");
    const parsed = raw ? JSON.parse(raw) : {};
    setPermMap(parsed || {});
  } catch {
    setPermMap({});
  } finally {
    setPermLoaded(true);
  }
}, []);

const norm = (v?: string) =>
  (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const vendorsScope =
  permLoaded
    ? (norm(permMap["crm.vendedores"]) ||
       norm(permMap["crm.sales_person"]) ||
       norm(permMap["vendedores"]))
    : "";

// Solo vista si NO es "accion"
const isReadOnly = permLoaded && vendorsScope !== "accion";

  const [searchText, setSearchText] = useState("");
  const [vendedores, setVendedores] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);

  type UserOption = {
    id: string;
    name: string;
    email?: string;
  };

  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [vendedorDialogOpen, setVendedorDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<SalesPerson | null>(null);
  const [deletingVendedor, setDeletingVendedor] = useState<SalesPerson | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Orden alfabético (igual que Customers)
  const [order, setOrder] = useState<"name.asc" | "name.desc">("name.asc");

  // Ir a página
  const [goToPageInput, setGoToPageInput] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    equipo: "",
    metaVentasMes: 0,
    userId: "none",
  });

  // Inicializar autenticación y cargar usuarios locales
  useEffect(() => {
    (async () => {
      try {
        setLoadingUsers(true);

        const { token } = await ensureAuth();
        const localUsers: LocalUser[] = await getLocalUsers(token);

        console.log("DBG local_users para vendedores:", localUsers);

        setUsers(
          localUsers.map((u) => ({
            id: u.user_id,
            name: u.email,
            email: u.email,
          }))
        );
      } catch (err) {
        console.error("Error cargando local_users para vendedores:", err);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  // Fetch vendedores
  const fetchVendedores = async () => {
    try {
      setLoading(true);
      const { token } = await ensureAuth();
      const data = await GetSalesPersons(token);
      setVendedores(data);
    } catch (error: any) {
      console.error("Error fetching vendedores:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vendedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendedores();
  }, []);

  // Cuando cambia la búsqueda, siempre volvemos a página 1
  useEffect(() => {
    setPage(1);
  }, [searchText]);

  // Filtrar vendedores
  const filteredVendedores = vendedores.filter((vendedor) =>
    vendedor.name.toLowerCase().includes(searchText.toLowerCase()) ||
    vendedor.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    vendedor.phone?.toLowerCase().includes(searchText.toLowerCase()) ||
    vendedor.team?.toLowerCase().includes(searchText.toLowerCase())
  );

  // ORDEN ALFABÉTICO sobre los filtrados
  const sortedVendedores = [...filteredVendedores].sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    if (order === "name.asc") {
      return nameA.localeCompare(nameB);
    }
    return nameB.localeCompare(nameA);
  });

  // Paginación sobre los ordenados
  const totalCount = sortedVendedores.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedVendedores = sortedVendedores.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const canGoPrev = page > 1;
  const canGoNext = page * pageSize < totalCount;

  const handleGoToPage = () => {
    const n = Number(goToPageInput);
    if (!Number.isFinite(n)) return;
    const target = Math.max(1, Math.min(totalPages, Math.trunc(n)));
    setPage(target);
  };

  const getPageItems = () => {
    const items: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }

    const showLeftDots = page > 4;
    const showRightDots = page < totalPages - 3;

    items.push(1);

    if (showLeftDots) {
      items.push("...");
    } else {
      items.push(2, 3);
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }

    if (showRightDots) {
      items.push("...");
    } else {
      for (let i = totalPages - 2; i <= totalPages - 1; i++) {
        if (i > 1 && i < totalPages && !items.includes(i)) {
          items.push(i);
        }
      }
    }

    if (!items.includes(totalPages)) items.push(totalPages);

    return items;
  };

  const handleOpenAddDialog = () => {
    if (isReadOnly) return;
    setEditingVendedor(null);
    setFormData({
      nombre: "",
      email: "",
      telefono: "",
      equipo: "",
      metaVentasMes: 0,
      userId: "none",
    });
    setVendedorDialogOpen(true);
  };

  const handleOpenEditDialog = (vendedor: SalesPerson) => {
    if (isReadOnly) return;
    setEditingVendedor(vendedor);
    setFormData({
      nombre: vendedor.name,
      email: vendedor.email,
      telefono: vendedor.phone || "",
      equipo: vendedor.team || "",
      metaVentasMes: vendedor.monthly_sales_goal || 0,
      userId: vendedor.user_id != null ? String(vendedor.user_id) : "none",
    });
    setVendedorDialogOpen(true);
  };

  const handleSaveVendedor = async () => {
    if (isReadOnly) return;
    if (!formData.nombre || !formData.email) {
      toast({
        title: "Error",
        description: "Nombre y email son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { token } = await ensureAuth();

      const resolvedUserId =
        formData.userId && formData.userId !== "none"
          ? formData.userId
          : null;

      if (editingVendedor) {
        await UpdateSalesPerson(
          {
            p_id: editingVendedor.id,
            p_data: {
              name: formData.nombre,
              email: formData.email,
              phone: formData.telefono || undefined,
              team: formData.equipo || undefined,
              monthly_sales_goal: formData.metaVentasMes || undefined,
              user_id: resolvedUserId,
            },
          },
          token
        );

        toast({
          title: "Éxito",
          description: "Vendedor actualizado correctamente",
        });
      } else {
        await CreateSalesPerson(
          {
            p_name: formData.nombre,
            p_email: formData.email,
            p_phone: formData.telefono || undefined,
            p_team: formData.equipo || undefined,
            p_monthly_sales_goal: formData.metaVentasMes || undefined,
            p_user_id: resolvedUserId,
          },
          token
        );

        toast({
          title: "Éxito",
          description: "Vendedor agregado correctamente",
        });
      }

      setVendedorDialogOpen(false);
      fetchVendedores();
    } catch (error: any) {
      console.error("Error saving vendedor:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el vendedor",
        variant: "destructive",
      });
    }
  };

  const handleOpenDeleteDialog = (vendedor: SalesPerson) => {
    if (isReadOnly) return;
    setDeletingVendedor(vendedor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteVendedor = async () => {
    if (isReadOnly) return;
    if (!deletingVendedor) return;

    try {
      const { token } = await ensureAuth();

      await DeleteSalesPerson(
        { p_id: deletingVendedor.id },
        token
      );

      toast({
        title: "Éxito",
        description: "Vendedor eliminado correctamente",
      });

      setDeleteDialogOpen(false);
      setDeletingVendedor(null);
      fetchVendedores();
    } catch (error: any) {
      console.error("Error deleting vendedor:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el vendedor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendedores CRM</h1>
          <p className="text-muted-foreground">Gestiona tu equipo de ventas</p>
        </div>

      <div className="flex items-center gap-2">
        {!isReadOnly && (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar vendedor
          </Button>
        )}
      </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendedores</CardTitle>
          <CardDescription>Filtra y busca entre tu equipo de ventas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="flex gap-2">

                            <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Orden A–Z / Z–A (igual que Customers) */}
              <Select
                value={order}
                onValueChange={(v: any) => {
                  setOrder(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name.asc">Nombre (A–Z)</SelectItem>
                  <SelectItem value="name.desc">Nombre (Z–A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Count info */}
          {!loading && (
            <div className="text-sm text-muted-foreground mb-2">
              Mostrando{" "}
              {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
              {"–"}
              {Math.min(page * pageSize, totalCount)}
              {" de "}
              {totalCount}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Cargando vendedores…
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center">Meta Mensual</TableHead>
                    {!isReadOnly && (
                      <TableHead className="text-right">Acciones</TableHead>
                    )}

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isReadOnly ? 4 : 5} className="text-center text-sm text-muted-foreground py-8">
                        No hay vendedores que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendedores.map((vendedor) => (
                      <TableRow key={vendedor.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{vendedor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {vendedor.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{vendedor.phone}</span>
                              </div>
                            )}
                            {vendedor.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{vendedor.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vendedor.team ? (
                            <span className="text-sm">{vendedor.team}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {vendedor.monthly_sales_goal || 0}
                            </span>
                          </div>
                        </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(vendedor)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleOpenDeleteDialog(vendedor)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación avanzada */}
          {!loading && totalCount > 0 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                {/* Bloque de paginación principal */}
                <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                  {canGoPrev && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-7 w-7"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {"<"}
                    </Button>
                  )}

                  {getPageItems().map((item, idx) =>
                    item === "..." ? (
                      <div
                        key={`dots-${idx}`}
                        className="px-2 text-xs text-muted-foreground select-none"
                      >
                        ...
                      </div>
                    ) : (
                      <Button
                        key={`page-${item}-${idx}`}
                        variant="ghost"
                        size="sm"
                        className={
                          item === page
                            ? "h-7 min-w-[2rem] rounded-full border border-gray-300 bg-white/50 text-gray-900 shadow-sm"
                            : "h-7 min-w-[2rem] rounded-full"
                        }
                        onClick={() => setPage(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}

                  {canGoNext && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-7 w-7"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {">"}
                    </Button>
                  )}
                </div>

                {/* Bloque: Ir a la página */}
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="text-muted-foreground">Ir a la página</span>
                  <Input
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    className="h-8 w-14 text-center text-xs md:text-sm"
                    inputMode="numeric"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGoToPage();
                      }
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs md:text-sm"
                    onClick={handleGoToPage}
                  >
                    Ir &gt;
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={vendedorDialogOpen} onOpenChange={setVendedorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVendedor ? "Editar Vendedor" : "Agregar Vendedor"}
            </DialogTitle>
            <DialogDescription>
              {editingVendedor
                ? "Actualiza la información del vendedor"
                : "Completa los datos del nuevo vendedor"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Usuario vinculado (opcional)</Label>
              <Select
                value={formData.userId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, userId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingUsers ? "Cargando usuarios..." : "Sin usuario asignado"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin usuario asignado</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.email ? `(${u.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+506 8888-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipo">Equipo</Label>
              <Input
                id="equipo"
                value={formData.equipo}
                onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
                placeholder="Centro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta">Meta Ventas/Mes</Label>
              <Input
                id="meta"
                type="number"
                value={formData.metaVentasMes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    metaVentasMes: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendedorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVendedor}>
              {editingVendedor ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Vendedor</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {deletingVendedor?.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteVendedor}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
