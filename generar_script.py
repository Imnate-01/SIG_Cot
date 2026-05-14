import re

data = """
| CA | Lassonde Specialties Inc. | 200 rue St-Joseph | Saint-Damase, QC | CFA 505-31 FP | 862551006 |
| CA | Cardiff Products | 2300 Discovery Dr | London, ON  N6M 0C6 | CFA 124-37 | 873051195 |
| CA | Cardiff Products | 2300 Discovery Dr | London, ON  N6M 0C6 | CFA 124-37 | 873051196 |
| CA | Cardiff Products | 2300 Discovery Dr | London, ON  N6M 0C6 | CFA 124-37 | 873051213 |
| US | Lyons Magnus, Inc. | 3158 E Hamilton Avenue | Fresno, CA 93702 | CFA 405-32 FP | 854451001 |
| US | Lyons Magnus, Inc. | 3158 E Hamilton Avenue | Fresno, CA 93702 | CFA 406-32 | 850451022 |
| US | Power Packaging | 525 Dunham Rd. | St. Charles, IL 60174 | CFA 405-21 | 8224N049 |
| US | Power Packaging | 525 Dunham Rd. | St. Charles, IL 60174 | CFA 406-32 | 850451016 |
| US | Power Packaging | 525 Dunham Rd. | St. Charles, IL 60174 | CFA 310-32 | 860351047 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CFA 312-35 | 869351072 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CDA 1012-36 | 890151006 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CFA 712-32 | 870751189 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CFA 312-35 | 869351091 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CFA 1824-37 | 874251003 |
| US | Steuben Foods Inc. | 1150 Maple Road | Elma, NY 14059 | CDA 1012-37 | 890151018 |
| US | Protenergy Natural Foods | 904 Woods Rd | Cambridge, MD 21613 | CFA 312-35 | 869351077 |
| US | Hirzel Canning Co. | 411 Lemoyne Rd. | Northwood, OH 43619 | CFA 505-31 FP | 862551003 |
| US | Refresco US, Inc. | 2090 Bartow Rd | Lakeland, FL 33801 | CFA 124-36 | 873051132 |
| US | Mountain Top Beverage | 6000 Rail Street | Morgantown, WV | CFA 124-37 | 873051197 |
| US | Mountain Top Beverage | 6000 Rail Street | Morgantown, WV | CFA 124-37 | 873051198 |
| US | Mountain Top Beverage | 6000 Rail Street | Morgantown, WV | CFA 124-37 | 873051204 |
| US | Lyons Magnus Kentucky | 95 Richwood Rd. | Walton, KY 41094 | CFA 406-32 | 850451003 |
| US | Lyons Magnus Kentucky | 95 Richwood Rd. | Walton, KY 41094 | CFA 405-32 FP | 854451002 |
| US | Lyons Magnus Kentucky | 95 Richwood Rd. | Walton, KY 41094 | CFA 406-32 | 850451027 |
| US | Johanna Beverage | 5625 W Thorpe Rd | Spokane, WA 99224 | CFA 112-32 | 870151177 |
| US | Leahy / IFP | 2232 Meridian Blvd., Ste. K | Minden, NV 89423 | CFA 406-32 | 850451014 |
| US | Leahy / IFP | 2232 Meridian Blvd., Ste. K | Minden, NV 89423 | CFA 406-32 | 850451015 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 405-21 | 8224N032 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 405-21 | 8224EA024 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 112-32 | 870151040 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 405-21 | 8224N056 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 312-35 | 869351129 |
| US | Kerry Ingredients & Flavours | 3400 Millington Road | Beloit, WI 53511 | CFA 406-32 | 850451028 |
| US | KROGER - DENVER | 10241 E 51st Ave | Denver, CO 80239 | CFA 312-35 | 869351113 |
| US | Leahy / IFP, Inc. | 2101 W Haven Avenue | New Lenox, IL 60451 | CFA 406-32 | 850451021 |
| US | Leahy / IFP, Inc. | 2101 W Haven Avenue | New Lenox, IL 60451 | CFA 406-32 | 850451024 |
| US | Leahy / IFP, Inc. | 2101 W Haven Avenue | New Lenox, IL 60451 | CFA 312-37 | 869351151 |
| US | Baldwin Richardson Foods | 1550 John Tipton Blvd. | Pennsauken, NJ 08110 | CFA 406-32 | 850451026 |
| US | Sun Orchard, LLC | 8600 N.W. 36th Street, Ste 250 | Doral, FL 33166 | CFA 406-32 | 850451020 |
| US | Sun Orchard, LLC | 8600 N.W. 36th Street, Ste 250 | Doral, FL 33166 | CFA 312-37 | 869351168 |
"""

lines = [line.strip() for line in data.split('\n') if line.strip()]

customers = {}
for line in lines:
    parts = [p.strip() for p in line.split('|')[1:-1]]
    if len(parts) != 6:
        continue
    country, name, address, city, model, serial = parts
    
    # Escape quotes
    name = name.replace("'", "''")
    address = address.replace("'", "''")
    city = city.replace("'", "''")
    
    if name not in customers:
        customers[name] = {
            'country': country,
            'address': address,
            'city': city,
            'machines': []
        }
    customers[name]['machines'].append({
        'model': model,
        'serial': serial
    })

sql = "DO $$\nDECLARE\n    v_cliente_id INT;\nBEGIN\n"

for name, info in customers.items():
    sql += f"    -------------------------------------------------\n"
    sql += f"    -- {name}\n"
    sql += f"    -------------------------------------------------\n"
    sql += f"    SELECT id INTO v_cliente_id FROM clientes WHERE nombre = '{name}' LIMIT 1;\n"
    sql += f"    IF v_cliente_id IS NULL THEN\n"
    sql += f"        INSERT INTO clientes (nombre, empresa, direccion, ciudad, pais)\n"
    sql += f"        VALUES ('{name}', '{name}', '{info['address']}', '{info['city']}', '{info['country']}')\n"
    sql += f"        RETURNING id INTO v_cliente_id;\n"
    sql += f"    END IF;\n\n"
    
    for m in info['machines']:
        sql += f"    IF NOT EXISTS (SELECT 1 FROM cliente_maquinas WHERE serie = '{m['serial']}' AND cliente_id = v_cliente_id) THEN\n"
        sql += f"        INSERT INTO cliente_maquinas (cliente_id, modelo_maquina, serie, machine_id)\n"
        sql += f"        VALUES (v_cliente_id, '{m['model']}', '{m['serial']}', '{m['serial']}');\n"
        sql += f"    END IF;\n\n"

sql += "END $$;\n"

with open("c:/Users/trevo/OneDrive/Documentos/sistema-cotizaciones/generar_script.py_out", "w") as f:
    f.write(sql)
