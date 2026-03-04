from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.cfop import CFOP
from models.ncm import NCM
from models.municipio import Municipio
from models.usuario import Usuario
from services.auth_service import hash_password

# ============================================================
# CFOPs — Operações relevantes para Produtor Rural
# ============================================================
CFOPS_INICIAIS = [
    # --- Saída Interna (5xxx) ---
    {"codigo": "5101", "descricao": "Venda de produção do estabelecimento", "tipo": "Saída Interna"},
    {"codigo": "5102", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros", "tipo": "Saída Interna"},
    {"codigo": "5105", "descricao": "Venda de produção do estabelecimento, que não deva por ele transitar", "tipo": "Saída Interna"},
    {"codigo": "5106", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros, que não deva por ela transitar", "tipo": "Saída Interna"},
    {"codigo": "5110", "descricao": "Venda de produção do estabelecimento, destinada à Zona Franca de Manaus", "tipo": "Saída Interna"},
    {"codigo": "5120", "descricao": "Venda de animal de criação", "tipo": "Saída Interna"},
    {"codigo": "5151", "descricao": "Transferência de produção do estabelecimento", "tipo": "Saída Interna"},
    {"codigo": "5152", "descricao": "Transferência de mercadoria adquirida ou recebida de terceiros", "tipo": "Saída Interna"},
    {"codigo": "5401", "descricao": "Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária", "tipo": "Saída Interna"},
    {"codigo": "5408", "descricao": "Transferência de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária", "tipo": "Saída Interna"},
    {"codigo": "5501", "descricao": "Remessa de produção do estabelecimento, com fim específico de exportação", "tipo": "Saída Interna"},
    {"codigo": "5502", "descricao": "Remessa de mercadoria adquirida ou recebida de terceiros, com fim específico de exportação", "tipo": "Saída Interna"},
    {"codigo": "5900", "descricao": "Outras saídas de mercadoria ou prestações de serviços não especificados", "tipo": "Saída Interna"},
    # --- Saída Interestadual (6xxx) ---
    {"codigo": "6101", "descricao": "Venda de produção do estabelecimento", "tipo": "Saída Interestadual"},
    {"codigo": "6102", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros", "tipo": "Saída Interestadual"},
    {"codigo": "6105", "descricao": "Venda de produção do estabelecimento, que não deva por ela transitar", "tipo": "Saída Interestadual"},
    {"codigo": "6106", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros, que não deva por ela transitar", "tipo": "Saída Interestadual"},
    {"codigo": "6110", "descricao": "Venda de produção do estabelecimento, destinada à Zona Franca de Manaus", "tipo": "Saída Interestadual"},
    {"codigo": "6120", "descricao": "Venda de animal de criação", "tipo": "Saída Interestadual"},
    {"codigo": "6151", "descricao": "Transferência de produção do estabelecimento", "tipo": "Saída Interestadual"},
    {"codigo": "6152", "descricao": "Transferência de mercadoria adquirida ou recebida de terceiros", "tipo": "Saída Interestadual"},
    {"codigo": "6401", "descricao": "Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária", "tipo": "Saída Interestadual"},
    {"codigo": "6501", "descricao": "Remessa de produção do estabelecimento, com fim específico de exportação", "tipo": "Saída Interestadual"},
    {"codigo": "6900", "descricao": "Outras saídas de mercadoria ou prestações de serviços não especificados", "tipo": "Saída Interestadual"},
    # --- Exportação (7xxx) ---
    {"codigo": "7101", "descricao": "Venda de produção do estabelecimento", "tipo": "Exportação"},
    {"codigo": "7102", "descricao": "Venda de mercadoria adquirida ou recebida de terceiros", "tipo": "Exportação"},
    {"codigo": "7501", "descricao": "Exportação de mercadorias recebidas com fim específico de exportação", "tipo": "Exportação"},
    # --- Entrada Interna (1xxx) ---
    {"codigo": "1101", "descricao": "Compra para industrialização ou produção rural", "tipo": "Entrada Interna"},
    {"codigo": "1102", "descricao": "Compra para comercialização", "tipo": "Entrada Interna"},
    {"codigo": "1111", "descricao": "Compra para industrialização de mercadoria recebida anteriormente em consignação industrial", "tipo": "Entrada Interna"},
    {"codigo": "1120", "descricao": "Compra para industrialização, em venda à ordem, já recebida do vendedor remetente", "tipo": "Entrada Interna"},
    {"codigo": "1151", "descricao": "Transferência para industrialização ou produção rural", "tipo": "Entrada Interna"},
    {"codigo": "1152", "descricao": "Transferência para comercialização", "tipo": "Entrada Interna"},
    {"codigo": "1201", "descricao": "Devolução de venda de produção do estabelecimento", "tipo": "Entrada Interna"},
    {"codigo": "1202", "descricao": "Devolução de venda de mercadoria adquirida ou recebida de terceiros", "tipo": "Entrada Interna"},
    # --- Entrada Interestadual (2xxx) ---
    {"codigo": "2101", "descricao": "Compra para industrialização ou produção rural", "tipo": "Entrada Interestadual"},
    {"codigo": "2102", "descricao": "Compra para comercialização", "tipo": "Entrada Interestadual"},
    {"codigo": "2151", "descricao": "Transferência para industrialização ou produção rural", "tipo": "Entrada Interestadual"},
    {"codigo": "2152", "descricao": "Transferência para comercialização", "tipo": "Entrada Interestadual"},
    {"codigo": "2201", "descricao": "Devolução de venda de produção do estabelecimento", "tipo": "Entrada Interestadual"},
    {"codigo": "2202", "descricao": "Devolução de venda de mercadoria adquirida ou recebida de terceiros", "tipo": "Entrada Interestadual"},
]

# ============================================================
# NCMs — Produtos agropecuários relevantes para RS/SC/PR/MG
# ============================================================
NCMS_INICIAIS = [
    # Cereais e grãos
    {"codigo": "1001.19.00", "descricao": "Trigo (outros)"},
    {"codigo": "1001.99.00", "descricao": "Outros trigos e misturas de trigo com centeio"},
    {"codigo": "1002.10.00", "descricao": "Centeio para semeadura"},
    {"codigo": "1002.90.00", "descricao": "Centeio (outros)"},
    {"codigo": "1003.10.00", "descricao": "Cevada para semeadura"},
    {"codigo": "1003.90.10", "descricao": "Cevada cervejeira"},
    {"codigo": "1003.90.90", "descricao": "Cevada (outros)"},
    {"codigo": "1004.10.00", "descricao": "Aveia para semeadura"},
    {"codigo": "1004.90.00", "descricao": "Aveia (outros)"},
    {"codigo": "1005.10.10", "descricao": "Milho para semeadura - híbrido"},
    {"codigo": "1005.10.90", "descricao": "Milho para semeadura - outros"},
    {"codigo": "1005.90.10", "descricao": "Milho em grão, exceto para semeadura"},
    {"codigo": "1005.90.90", "descricao": "Milho (outros)"},
    {"codigo": "1006.10.10", "descricao": "Arroz em casca para semeadura"},
    {"codigo": "1006.10.90", "descricao": "Arroz em casca (outros)"},
    {"codigo": "1006.20.00", "descricao": "Arroz descascado (arroz cargo ou castanho)"},
    {"codigo": "1006.30.11", "descricao": "Arroz semibranqueado ou branqueado, parboilizado"},
    {"codigo": "1006.30.21", "descricao": "Arroz branqueado, não parboilizado"},
    {"codigo": "1006.40.00", "descricao": "Arroz partido"},
    {"codigo": "1007.10.00", "descricao": "Sorgo para semeadura"},
    {"codigo": "1007.90.00", "descricao": "Sorgo (outros)"},
    {"codigo": "1008.10.00", "descricao": "Trigo sarraceno"},
    {"codigo": "1008.50.00", "descricao": "Quinoa"},
    # Oleaginosas
    {"codigo": "1201.10.00", "descricao": "Soja para semeadura"},
    {"codigo": "1201.90.00", "descricao": "Soja, mesmo triturada, exceto para semeadura"},
    {"codigo": "1204.00.10", "descricao": "Sementes de linhaça para semeadura"},
    {"codigo": "1204.00.90", "descricao": "Sementes de linhaça (outros)"},
    {"codigo": "1205.10.10", "descricao": "Sementes de colza para semeadura"},
    {"codigo": "1205.10.90", "descricao": "Sementes de colza (outros)"},
    {"codigo": "1206.00.10", "descricao": "Sementes de girassol para semeadura"},
    {"codigo": "1206.00.90", "descricao": "Sementes de girassol (outros)"},
    {"codigo": "1207.50.10", "descricao": "Sementes de gergelim para semeadura"},
    {"codigo": "1207.99.10", "descricao": "Outras sementes e frutos oleaginosos para semeadura"},
    # Leguminosas
    {"codigo": "0713.10.10", "descricao": "Ervilhas para semeadura"},
    {"codigo": "0713.10.90", "descricao": "Ervilhas (outros)"},
    {"codigo": "0713.20.10", "descricao": "Grão-de-bico para semeadura"},
    {"codigo": "0713.31.10", "descricao": "Feijão Vigna para semeadura"},
    {"codigo": "0713.33.19", "descricao": "Feijão preto (outros)"},
    {"codigo": "0713.33.29", "descricao": "Feijão carioca (outros)"},
    {"codigo": "0713.40.10", "descricao": "Lentilha para semeadura"},
    {"codigo": "0713.50.10", "descricao": "Favas para semeadura"},
    {"codigo": "0713.90.10", "descricao": "Outras leguminosas para semeadura"},
    # Carnes bovinas
    {"codigo": "0201.10.00", "descricao": "Carcaças e meias-carcaças bovinas, frescas"},
    {"codigo": "0201.20.00", "descricao": "Outros cortes bovinos com osso, frescos"},
    {"codigo": "0201.30.00", "descricao": "Cortes bovinos desossados, frescos"},
    {"codigo": "0202.10.00", "descricao": "Carcaças e meias-carcaças bovinas, congeladas"},
    {"codigo": "0202.20.00", "descricao": "Outros cortes bovinos com osso, congelados"},
    {"codigo": "0202.30.00", "descricao": "Cortes bovinos desossados, congelados"},
    # Carnes suínas
    {"codigo": "0203.11.00", "descricao": "Carcaças e meias-carcaças suínas, frescas"},
    {"codigo": "0203.19.00", "descricao": "Outros cortes suínos frescos"},
    {"codigo": "0203.21.00", "descricao": "Carcaças e meias-carcaças suínas, congeladas"},
    {"codigo": "0203.29.00", "descricao": "Outros cortes suínos congelados"},
    # Carnes ovinas e caprinas
    {"codigo": "0204.10.00", "descricao": "Carcaças e meias-carcaças de ovinos, frescas"},
    {"codigo": "0204.22.00", "descricao": "Outros cortes de ovinos com osso, frescos"},
    {"codigo": "0204.50.00", "descricao": "Carcaças de caprinos, frescas"},
    # Aves
    {"codigo": "0207.11.00", "descricao": "Frangos não cortados, frescos ou refrigerados"},
    {"codigo": "0207.12.00", "descricao": "Frangos não cortados, congelados"},
    {"codigo": "0207.13.00", "descricao": "Pedaços e miudezas de frangos, frescos"},
    {"codigo": "0207.14.00", "descricao": "Pedaços e miudezas de frangos, congelados"},
    {"codigo": "0207.24.00", "descricao": "Perus não cortados, frescos ou refrigerados"},
    # Ovos
    {"codigo": "0407.11.00", "descricao": "Ovos de galinha para incubação"},
    {"codigo": "0407.21.00", "descricao": "Ovos de galinha frescos"},
    # Leite e laticínios
    {"codigo": "0401.10.10", "descricao": "Leite fluido integral UHT"},
    {"codigo": "0401.20.10", "descricao": "Leite fluido semidesnatado UHT"},
    {"codigo": "0401.40.10", "descricao": "Leite com teor de gordura > 1% e ≤ 6%"},
    {"codigo": "0402.10.10", "descricao": "Leite em pó desnatado"},
    {"codigo": "0402.21.10", "descricao": "Leite em pó integral"},
    {"codigo": "0403.10.00", "descricao": "Iogurte"},
    {"codigo": "0404.10.00", "descricao": "Soro de leite"},
    {"codigo": "0405.10.00", "descricao": "Manteiga"},
    {"codigo": "0406.10.00", "descricao": "Queijo fresco"},
    {"codigo": "0406.90.10", "descricao": "Queijo prato"},
    # Vegetais
    {"codigo": "0701.90.00", "descricao": "Batatas, frescas ou refrigeradas"},
    {"codigo": "0702.00.00", "descricao": "Tomates frescos ou refrigerados"},
    {"codigo": "0703.10.00", "descricao": "Cebolas e chalotas frescas"},
    {"codigo": "0703.20.00", "descricao": "Alho fresco"},
    {"codigo": "0704.10.00", "descricao": "Couve-flor e brócolis frescos"},
    {"codigo": "0704.20.00", "descricao": "Couve de Bruxelas fresca"},
    {"codigo": "0704.90.10", "descricao": "Repolho fresco"},
    {"codigo": "0705.11.00", "descricao": "Alface repolhuda, fresca"},
    {"codigo": "0706.10.00", "descricao": "Cenouras e nabos frescos"},
    {"codigo": "0707.00.00", "descricao": "Pepinos e pepinilhos frescos"},
    {"codigo": "0708.10.00", "descricao": "Ervilhas em vagem frescas"},
    {"codigo": "0708.20.00", "descricao": "Feijão verde fresco"},
    {"codigo": "0709.20.00", "descricao": "Aspargos frescos"},
    {"codigo": "0709.30.00", "descricao": "Berinjelas frescas"},
    {"codigo": "0709.40.00", "descricao": "Aipo fresco"},
    {"codigo": "0709.60.00", "descricao": "Pimentas e pimentões frescos"},
    {"codigo": "0709.70.00", "descricao": "Espinafre fresco"},
    {"codigo": "0709.91.00", "descricao": "Alcachofra fresca"},
    {"codigo": "0709.93.00", "descricao": "Abóboras e morangas frescas"},
    {"codigo": "0710.10.00", "descricao": "Batatas congeladas"},
    {"codigo": "0714.20.00", "descricao": "Batata-doce fresca"},
    # Frutas
    {"codigo": "0803.90.10", "descricao": "Bananas nanicas frescas"},
    {"codigo": "0804.40.00", "descricao": "Abacates frescos"},
    {"codigo": "0805.10.00", "descricao": "Laranjas frescas"},
    {"codigo": "0805.20.00", "descricao": "Tangerinas frescas"},
    {"codigo": "0805.40.00", "descricao": "Toranjas (pomelo) frescas"},
    {"codigo": "0805.50.00", "descricao": "Limões frescos"},
    {"codigo": "0806.10.00", "descricao": "Uvas frescas de mesa"},
    {"codigo": "0807.11.00", "descricao": "Melancias frescas"},
    {"codigo": "0807.19.00", "descricao": "Melões frescos"},
    {"codigo": "0808.10.00", "descricao": "Maçãs frescas"},
    {"codigo": "0808.30.00", "descricao": "Peras frescas"},
    {"codigo": "0809.10.00", "descricao": "Damascos frescos"},
    {"codigo": "0809.21.00", "descricao": "Cerejas frescas"},
    {"codigo": "0809.29.00", "descricao": "Outras cerejas frescas"},
    {"codigo": "0809.30.00", "descricao": "Pêssegos frescos"},
    {"codigo": "0809.40.00", "descricao": "Ameixas frescas"},
    {"codigo": "0810.10.00", "descricao": "Morangos frescos"},
    {"codigo": "0810.20.10", "descricao": "Framboesas frescas"},
    # Café, erva-mate e fumo
    {"codigo": "0901.11.10", "descricao": "Café não torrado, não descafeinado, em grão"},
    {"codigo": "0901.11.90", "descricao": "Café não torrado, não descafeinado (outros)"},
    {"codigo": "0901.21.00", "descricao": "Café torrado, não descafeinado, em grão"},
    {"codigo": "0903.00.10", "descricao": "Erva-mate cancheada"},
    {"codigo": "0903.00.90", "descricao": "Erva-mate (outros)"},
    {"codigo": "2401.10.20", "descricao": "Fumo (tabaco) não manufaturado de Virgínia"},
    {"codigo": "2401.20.20", "descricao": "Fumo (tabaco) parcialmente desnevurado"},
    # Vitivinicultura e bebidas
    {"codigo": "0806.20.00", "descricao": "Uvas secas (passa)"},
    {"codigo": "2009.61.00", "descricao": "Suco de uva não fermentado"},
    {"codigo": "2204.21.00", "descricao": "Vinho de uvas frescas em recipientes ≤ 2L"},
    {"codigo": "2204.22.00", "descricao": "Vinho de uvas frescas em recipientes > 2L e ≤ 10L"},
    {"codigo": "2204.29.00", "descricao": "Outros vinhos de uvas frescas"},
    {"codigo": "2206.00.10", "descricao": "Sidra"},
    # Madeira e reflorestamento
    {"codigo": "4401.11.00", "descricao": "Lenha de coníferas"},
    {"codigo": "4401.12.00", "descricao": "Lenha de não coníferas"},
    {"codigo": "4403.11.00", "descricao": "Madeira em bruto de pinus (tratada)"},
    {"codigo": "4403.12.00", "descricao": "Madeira em bruto de eucalipto (tratada)"},
    {"codigo": "4403.91.00", "descricao": "Madeira em bruto de coníferas"},
    {"codigo": "4403.99.00", "descricao": "Madeira em bruto (outras)"},
    # Mel e apicultura
    {"codigo": "0409.00.00", "descricao": "Mel natural"},
    {"codigo": "0410.00.10", "descricao": "Própolis"},
    # Flores e plantas
    {"codigo": "0602.10.00", "descricao": "Estacas e mudas não enraizadas"},
    {"codigo": "0602.20.00", "descricao": "Árvores, arbustos e plantas lenhosas"},
    {"codigo": "0603.11.00", "descricao": "Rosas cortadas frescas"},
    {"codigo": "0604.20.00", "descricao": "Folhagens, folhas e ramos frescos"},
    # Peixes e pescado
    {"codigo": "0301.11.10", "descricao": "Tilápias vivas"},
    {"codigo": "0302.71.00", "descricao": "Tilápias frescas"},
    {"codigo": "0303.89.10", "descricao": "Carpas congeladas"},
    {"codigo": "0304.61.00", "descricao": "Filés de tilápias frescos"},
]

# ============================================================
# Municípios — RS, SC, PR, MG
# ============================================================
MUNICIPIOS_INICIAIS = [
    # ==========================
    # Rio Grande do Sul (RS)
    # ==========================
    {"codigo_ibge": "4300109", "nome": "Aceguá", "uf": "RS"},
    {"codigo_ibge": "4300208", "nome": "Água Santa", "uf": "RS"},
    {"codigo_ibge": "4300307", "nome": "Agudo", "uf": "RS"},
    {"codigo_ibge": "4300406", "nome": "Ajuricaba", "uf": "RS"},
    {"codigo_ibge": "4300505", "nome": "Alecrim", "uf": "RS"},
    {"codigo_ibge": "4300604", "nome": "Alegrete", "uf": "RS"},
    {"codigo_ibge": "4300638", "nome": "Alegria", "uf": "RS"},
    {"codigo_ibge": "4300802", "nome": "Alvorada", "uf": "RS"},
    {"codigo_ibge": "4301008", "nome": "Amaral Ferrador", "uf": "RS"},
    {"codigo_ibge": "4301404", "nome": "Antônio Prado", "uf": "RS"},
    {"codigo_ibge": "4301602", "nome": "Bagé", "uf": "RS"},
    {"codigo_ibge": "4302105", "nome": "Bento Gonçalves", "uf": "RS"},
    {"codigo_ibge": "4302600", "nome": "Bom Retiro do Sul", "uf": "RS"},
    {"codigo_ibge": "4302808", "nome": "Cachoeira do Sul", "uf": "RS"},
    {"codigo_ibge": "4302907", "nome": "Cachoeirinha", "uf": "RS"},
    {"codigo_ibge": "4303004", "nome": "Camaquã", "uf": "RS"},
    {"codigo_ibge": "4303202", "nome": "Campo Bom", "uf": "RS"},
    {"codigo_ibge": "4303905", "nome": "Canela", "uf": "RS"},
    {"codigo_ibge": "4304002", "nome": "Canguçu", "uf": "RS"},
    {"codigo_ibge": "4304101", "nome": "Canoas", "uf": "RS"},
    {"codigo_ibge": "4304606", "nome": "Carazinho", "uf": "RS"},
    {"codigo_ibge": "4305108", "nome": "Caxias do Sul", "uf": "RS"},
    {"codigo_ibge": "4305900", "nome": "Cerro Largo", "uf": "RS"},
    {"codigo_ibge": "4306403", "nome": "Cruz Alta", "uf": "RS"},
    {"codigo_ibge": "4307005", "nome": "Dom Feliciano", "uf": "RS"},
    {"codigo_ibge": "4307203", "nome": "Dom Pedrito", "uf": "RS"},
    {"codigo_ibge": "4307104", "nome": "Erechim", "uf": "RS"},
    {"codigo_ibge": "4307609", "nome": "Estrela", "uf": "RS"},
    {"codigo_ibge": "4308706", "nome": "Frederico Westphalen", "uf": "RS"},
    {"codigo_ibge": "4309209", "nome": "Gravataí", "uf": "RS"},
    {"codigo_ibge": "4309308", "nome": "Guaíba", "uf": "RS"},
    {"codigo_ibge": "4310801", "nome": "Ijuí", "uf": "RS"},
    {"codigo_ibge": "4311403", "nome": "Júlio de Castilhos", "uf": "RS"},
    {"codigo_ibge": "4312401", "nome": "Lajeado", "uf": "RS"},
    {"codigo_ibge": "4313003", "nome": "Marcelino Ramos", "uf": "RS"},
    {"codigo_ibge": "4313201", "nome": "Marau", "uf": "RS"},
    {"codigo_ibge": "4313409", "nome": "Novo Hamburgo", "uf": "RS"},
    {"codigo_ibge": "4313805", "nome": "Novo Barreiro", "uf": "RS"},
    {"codigo_ibge": "4314100", "nome": "Passo Fundo", "uf": "RS"},
    {"codigo_ibge": "4314407", "nome": "Pelotas", "uf": "RS"},
    {"codigo_ibge": "4314803", "nome": "Pinhal Grande", "uf": "RS"},
    {"codigo_ibge": "4314902", "nome": "Porto Alegre", "uf": "RS"},
    {"codigo_ibge": "4315107", "nome": "Porto Lucena", "uf": "RS"},
    {"codigo_ibge": "4315602", "nome": "Rio Grande", "uf": "RS"},
    {"codigo_ibge": "4315800", "nome": "Rolante", "uf": "RS"},
    {"codigo_ibge": "4316004", "nome": "Santa Cruz do Sul", "uf": "RS"},
    {"codigo_ibge": "4316907", "nome": "Santa Maria", "uf": "RS"},
    {"codigo_ibge": "4317202", "nome": "Santo Ângelo", "uf": "RS"},
    {"codigo_ibge": "4317608", "nome": "Santo Augusto", "uf": "RS"},
    {"codigo_ibge": "4317905", "nome": "São Borja", "uf": "RS"},
    {"codigo_ibge": "4318002", "nome": "São Francisco de Assis", "uf": "RS"},
    {"codigo_ibge": "4318309", "nome": "São Gabriel", "uf": "RS"},
    {"codigo_ibge": "4318408", "nome": "São Jerônimo", "uf": "RS"},
    {"codigo_ibge": "4318705", "nome": "São Leopoldo", "uf": "RS"},
    {"codigo_ibge": "4318903", "nome": "São Lourenço do Sul", "uf": "RS"},
    {"codigo_ibge": "4319406", "nome": "São Luiz Gonzaga", "uf": "RS"},
    {"codigo_ibge": "4319901", "nome": "São Pedro do Sul", "uf": "RS"},
    {"codigo_ibge": "4320008", "nome": "São Sepé", "uf": "RS"},
    {"codigo_ibge": "4321303", "nome": "Taquari", "uf": "RS"},
    {"codigo_ibge": "4321600", "nome": "Tenente Portela", "uf": "RS"},
    {"codigo_ibge": "4321808", "nome": "Teutônia", "uf": "RS"},
    {"codigo_ibge": "4322400", "nome": "Uruguaiana", "uf": "RS"},
    {"codigo_ibge": "4322509", "nome": "Vacaria", "uf": "RS"},
    {"codigo_ibge": "4322608", "nome": "Vale Verde", "uf": "RS"},
    {"codigo_ibge": "4323002", "nome": "Viamão", "uf": "RS"},
    {"codigo_ibge": "4323101", "nome": "Vista Alegre", "uf": "RS"},

    # ==========================
    # Santa Catarina (SC)
    # ==========================
    {"codigo_ibge": "4200101", "nome": "Abelardo Luz", "uf": "SC"},
    {"codigo_ibge": "4202008", "nome": "Araranguá", "uf": "SC"},
    {"codigo_ibge": "4202404", "nome": "Blumenau", "uf": "SC"},
    {"codigo_ibge": "4202602", "nome": "Brusque", "uf": "SC"},
    {"codigo_ibge": "4202701", "nome": "Caçador", "uf": "SC"},
    {"codigo_ibge": "4203402", "nome": "Canoinhas", "uf": "SC"},
    {"codigo_ibge": "4203808", "nome": "Chapecó", "uf": "SC"},
    {"codigo_ibge": "4204202", "nome": "Concórdia", "uf": "SC"},
    {"codigo_ibge": "4204608", "nome": "Criciúma", "uf": "SC"},
    {"codigo_ibge": "4204707", "nome": "Curitibanos", "uf": "SC"},
    {"codigo_ibge": "4205001", "nome": "Florianópolis", "uf": "SC"},
    {"codigo_ibge": "4205209", "nome": "Fraiburgo", "uf": "SC"},
    {"codigo_ibge": "4205506", "nome": "Gaspar", "uf": "SC"},
    {"codigo_ibge": "4205704", "nome": "Grão-Pará", "uf": "SC"},
    {"codigo_ibge": "4206009", "nome": "Guaraciaba", "uf": "SC"},
    {"codigo_ibge": "4206405", "nome": "Herval d'Oeste", "uf": "SC"},
    {"codigo_ibge": "4207205", "nome": "Içara", "uf": "SC"},
    {"codigo_ibge": "4208600", "nome": "Itajaí", "uf": "SC"},
    {"codigo_ibge": "4208709", "nome": "Itapema", "uf": "SC"},
    {"codigo_ibge": "4209300", "nome": "Jaguaruna", "uf": "SC"},
    {"codigo_ibge": "4209409", "nome": "Jaraguá do Sul", "uf": "SC"},
    {"codigo_ibge": "4209508", "nome": "Joaçaba", "uf": "SC"},
    {"codigo_ibge": "4209607", "nome": "Joinville", "uf": "SC"},
    {"codigo_ibge": "4209706", "nome": "Laguna", "uf": "SC"},
    {"codigo_ibge": "4210605", "nome": "Mafra", "uf": "SC"},
    {"codigo_ibge": "4210803", "nome": "Mondaí", "uf": "SC"},
    {"codigo_ibge": "4212106", "nome": "Palhoça", "uf": "SC"},
    {"codigo_ibge": "4212403", "nome": "Palmitos", "uf": "SC"},
    {"codigo_ibge": "4213005", "nome": "Pinhalzinho", "uf": "SC"},
    {"codigo_ibge": "4213401", "nome": "Pomerode", "uf": "SC"},
    {"codigo_ibge": "4214003", "nome": "Porto União", "uf": "SC"},
    {"codigo_ibge": "4215305", "nome": "Rio do Sul", "uf": "SC"},
    {"codigo_ibge": "4215604", "nome": "Rio Negrinho", "uf": "SC"},
    {"codigo_ibge": "4217007", "nome": "São Bento do Sul", "uf": "SC"},
    {"codigo_ibge": "4217204", "nome": "São Carlos", "uf": "SC"},
    {"codigo_ibge": "4217501", "nome": "São Francisco do Sul", "uf": "SC"},
    {"codigo_ibge": "4217808", "nome": "São Joaquim", "uf": "SC"},
    {"codigo_ibge": "4217907", "nome": "São José", "uf": "SC"},
    {"codigo_ibge": "4218103", "nome": "São Lourenço do Oeste", "uf": "SC"},
    {"codigo_ibge": "4218202", "nome": "São Miguel d'Oeste", "uf": "SC"},
    {"codigo_ibge": "4218608", "nome": "Seara", "uf": "SC"},
    {"codigo_ibge": "4219507", "nome": "Timbó", "uf": "SC"},
    {"codigo_ibge": "4219606", "nome": "Três Barras", "uf": "SC"},
    {"codigo_ibge": "4220108", "nome": "Tubarão", "uf": "SC"},
    {"codigo_ibge": "4220602", "nome": "Videira", "uf": "SC"},
    {"codigo_ibge": "4220909", "nome": "Xanxerê", "uf": "SC"},
    {"codigo_ibge": "4221107", "nome": "Xaxim", "uf": "SC"},

    # ==========================
    # Paraná (PR)
    # ==========================
    {"codigo_ibge": "4100400", "nome": "Almirante Tamandaré", "uf": "PR"},
    {"codigo_ibge": "4101200", "nome": "Ampére", "uf": "PR"},
    {"codigo_ibge": "4101507", "nome": "Andirá", "uf": "PR"},
    {"codigo_ibge": "4102000", "nome": "Arapongas", "uf": "PR"},
    {"codigo_ibge": "4102406", "nome": "Araucária", "uf": "PR"},
    {"codigo_ibge": "4102901", "nome": "Assis Chateaubriand", "uf": "PR"},
    {"codigo_ibge": "4103008", "nome": "Astorga", "uf": "PR"},
    {"codigo_ibge": "4103305", "nome": "Bandeirantes", "uf": "PR"},
    {"codigo_ibge": "4104808", "nome": "Campina Grande do Sul", "uf": "PR"},
    {"codigo_ibge": "4105508", "nome": "Campo Largo", "uf": "PR"},
    {"codigo_ibge": "4105706", "nome": "Campo Mourão", "uf": "PR"},
    {"codigo_ibge": "4106209", "nome": "Cascavel", "uf": "PR"},
    {"codigo_ibge": "4106506", "nome": "Céu Azul", "uf": "PR"},
    {"codigo_ibge": "4107304", "nome": "Colombo", "uf": "PR"},
    {"codigo_ibge": "4107405", "nome": "Colorado", "uf": "PR"},
    {"codigo_ibge": "4107702", "nome": "Cornélio Procópio", "uf": "PR"},
    {"codigo_ibge": "4108304", "nome": "Curitiba", "uf": "PR"},
    {"codigo_ibge": "4108700", "nome": "Engenheiro Beltrão", "uf": "PR"},
    {"codigo_ibge": "4109401", "nome": "Faxinal", "uf": "PR"},
    {"codigo_ibge": "4109906", "nome": "Foz do Iguaçu", "uf": "PR"},
    {"codigo_ibge": "4110409", "nome": "Francisco Beltrão", "uf": "PR"},
    {"codigo_ibge": "4110904", "nome": "Guarapuava", "uf": "PR"},
    {"codigo_ibge": "4111506", "nome": "Ibiporã", "uf": "PR"},
    {"codigo_ibge": "4112306", "nome": "Irati", "uf": "PR"},
    {"codigo_ibge": "4113205", "nome": "Londrina", "uf": "PR"},
    {"codigo_ibge": "4113700", "nome": "Maringá", "uf": "PR"},
    {"codigo_ibge": "4114807", "nome": "Palmas", "uf": "PR"},
    {"codigo_ibge": "4115200", "nome": "Paranaguá", "uf": "PR"},
    {"codigo_ibge": "4115358", "nome": "Paranavaí", "uf": "PR"},
    {"codigo_ibge": "4115705", "nome": "Pato Branco", "uf": "PR"},
    {"codigo_ibge": "4117602", "nome": "Pinhais", "uf": "PR"},
    {"codigo_ibge": "4118204", "nome": "Ponta Grossa", "uf": "PR"},
    {"codigo_ibge": "4119509", "nome": "Rolândia", "uf": "PR"},
    {"codigo_ibge": "4119608", "nome": "Rondon", "uf": "PR"},
    {"codigo_ibge": "4120804", "nome": "São José dos Pinhais", "uf": "PR"},
    {"codigo_ibge": "4121208", "nome": "Sarandi", "uf": "PR"},
    {"codigo_ibge": "4121802", "nome": "Terra Boa", "uf": "PR"},
    {"codigo_ibge": "4122206", "nome": "Toledo", "uf": "PR"},
    {"codigo_ibge": "4122909", "nome": "Umuarama", "uf": "PR"},
    {"codigo_ibge": "4123303", "nome": "União da Vitória", "uf": "PR"},

    # ==========================
    # Minas Gerais (MG)
    # ==========================
    {"codigo_ibge": "3101508", "nome": "Alfenas", "uf": "MG"},
    {"codigo_ibge": "3102803", "nome": "Araguari", "uf": "MG"},
    {"codigo_ibge": "3103405", "nome": "Araxá", "uf": "MG"},
    {"codigo_ibge": "3104502", "nome": "Belo Horizonte", "uf": "MG"},
    {"codigo_ibge": "3105608", "nome": "Betim", "uf": "MG"},
    {"codigo_ibge": "3106200", "nome": "Boa Esperança", "uf": "MG"},
    {"codigo_ibge": "3106705", "nome": "Bom Despacho", "uf": "MG"},
    {"codigo_ibge": "3108602", "nome": "Caratinga", "uf": "MG"},
    {"codigo_ibge": "3109006", "nome": "Cataguases", "uf": "MG"},
    {"codigo_ibge": "3110004", "nome": "Congonhas", "uf": "MG"},
    {"codigo_ibge": "3111002", "nome": "Conselheiro Lafaiete", "uf": "MG"},
    {"codigo_ibge": "3111308", "nome": "Contagem", "uf": "MG"},
    {"codigo_ibge": "3112109", "nome": "Coronel Fabriciano", "uf": "MG"},
    {"codigo_ibge": "3113404", "nome": "Diamantina", "uf": "MG"},
    {"codigo_ibge": "3115300", "nome": "Divinópolis", "uf": "MG"},
    {"codigo_ibge": "3116605", "nome": "Formiga", "uf": "MG"},
    {"codigo_ibge": "3118601", "nome": "Governador Valadares", "uf": "MG"},
    {"codigo_ibge": "3120904", "nome": "Ipatinga", "uf": "MG"},
    {"codigo_ibge": "3122306", "nome": "Itajubá", "uf": "MG"},
    {"codigo_ibge": "3123807", "nome": "Ituiutaba", "uf": "MG"},
    {"codigo_ibge": "3127701", "nome": "João Monlevade", "uf": "MG"},
    {"codigo_ibge": "3129905", "nome": "Juiz de Fora", "uf": "MG"},
    {"codigo_ibge": "3131307", "nome": "Lagoa da Prata", "uf": "MG"},
    {"codigo_ibge": "3131703", "nome": "Lagoa Santa", "uf": "MG"},
    {"codigo_ibge": "3133709", "nome": "Lavras", "uf": "MG"},
    {"codigo_ibge": "3135209", "nome": "Manhuaçu", "uf": "MG"},
    {"codigo_ibge": "3136702", "nome": "Montes Claros", "uf": "MG"},
    {"codigo_ibge": "3138203", "nome": "Muriaé", "uf": "MG"},
    {"codigo_ibge": "3141405", "nome": "Patos de Minas", "uf": "MG"},
    {"codigo_ibge": "3143104", "nome": "Poços de Caldas", "uf": "MG"},
    {"codigo_ibge": "3143302", "nome": "Pouso Alegre", "uf": "MG"},
    {"codigo_ibge": "3146107", "nome": "Ribeirão das Neves", "uf": "MG"},
    {"codigo_ibge": "3149309", "nome": "Sete Lagoas", "uf": "MG"},
    {"codigo_ibge": "3156700", "nome": "Teófilo Otoni", "uf": "MG"},
    {"codigo_ibge": "3157807", "nome": "Timóteo", "uf": "MG"},
    {"codigo_ibge": "3162500", "nome": "Uberaba", "uf": "MG"},
    {"codigo_ibge": "3163200", "nome": "Uberlândia", "uf": "MG"},
    {"codigo_ibge": "3164704", "nome": "Unaí", "uf": "MG"},
    {"codigo_ibge": "3168606", "nome": "Varginha", "uf": "MG"},
    {"codigo_ibge": "3169901", "nome": "Viçosa", "uf": "MG"},
]


async def seed_cfops(db: AsyncSession):
    result = await db.execute(select(CFOP).limit(1))
    if result.scalar_one_or_none():
        return
    for item in CFOPS_INICIAIS:
        db.add(CFOP(**item))
    await db.commit()


async def seed_ncms(db: AsyncSession):
    result = await db.execute(select(NCM).limit(1))
    if result.scalar_one_or_none():
        return
    for item in NCMS_INICIAIS:
        db.add(NCM(**item))
    await db.commit()


async def seed_municipios(db: AsyncSession):
    result = await db.execute(select(Municipio).limit(1))
    if result.scalar_one_or_none():
        return
    for item in MUNICIPIOS_INICIAIS:
        db.add(Municipio(**item))
    await db.commit()


async def seed_admin(db: AsyncSession):
    result = await db.execute(select(Usuario).limit(1))
    if result.scalar_one_or_none():
        return
    admin = Usuario(
        username="admin",
        hashed_password=hash_password("admin123"),
        nome="Administrador",
        role="admin",
    )
    db.add(admin)
    await db.commit()


async def run_seeds(db: AsyncSession):
    await seed_cfops(db)
    await seed_ncms(db)
    await seed_municipios(db)
    await seed_admin(db)
