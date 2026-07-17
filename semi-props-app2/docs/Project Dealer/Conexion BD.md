# Conexion BD

# Conexión con **pgAdmin Desktop** (paso a paso)

1.  Abre **pgAdmin** → **Add New Server…**
2.  **General**
    - Name: `Prod - semi_props (team_admin)` _(o el alias que prefieras)_
3.  **Connection**
    - Host name/address: `191.101.15.148`
    - Port: `5432`
    - Maintenance database: `postgres` _(o_ `semi_props`_, ambos funcionan)_
    - Username: `team_admin`
    - Password: `4h8tP84^8(N`
    - Save password: ✓ (si lo permiten las políticas internas)
4.  **SSL**
    - SSL mode: `disable` _(si configuraste TLS)_
        - (Opcional) Cargar CA/Cert si usas verificación estricta
5.  **Advanced (opcional)**
    - DB restricion (vacío)
6.  **Guardar** y **Connect**

> Si no usas SSL, cambia “SSL mode: disable” y considera un túnel SSH (pgAdmin → pestaña SSH Tunnel) para cifrar el tráfico.

Context, objectives, and scope of the document