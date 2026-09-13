import type { Product } from "@/domain"

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    wholesalerId: "u2",
    wholesalerName: "Distribuidora Pérez CA",
    name: "Aceite de Oliva Extra Virgen 1L",
    description:
      "Aceite de oliva importado, primera presión en frío. Ideal para restaurantes y consumo familiar.",
    unitPrice: 4.5,
    currency: "USDC",
    minUnits: 50,
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=400&fit=crop&auto=format",
    category: "Alimentos",
    available: true,
    createdAt: "2026-08-16",
  },
  {
    id: "p2",
    wholesalerId: "u2",
    wholesalerName: "Distribuidora Pérez CA",
    name: "Papel Higiénico Doble Hoja x48",
    description:
      "Papel higiénico premium doble hoja, paquete de 48 rollos. Stock permanente.",
    unitPrice: 12.0,
    currency: "USDC",
    minUnits: 20,
    image:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop&auto=format",
    category: "Higiene",
    available: true,
    createdAt: "2026-08-18",
  },
  {
    id: "p3",
    wholesalerId: "u2",
    wholesalerName: "Distribuidora Pérez CA",
    name: "Detergente Líquido 5L",
    description:
      "Detergente concentrado para ropa. Rendimiento de hasta 250 lavados por envase.",
    unitPrice: 8.0,
    currency: "USDC",
    minUnits: 30,
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=400&fit=crop&auto=format",
    category: "Limpieza",
    available: true,
    createdAt: "2026-08-20",
  },
  {
    id: "p4",
    wholesalerId: "u2",
    wholesalerName: "Distribuidora Pérez CA",
    name: "Café Tostado Molido 1kg",
    description: "Café venezolano de altura, tostado medio. Origen Mérida.",
    unitPrice: 6.0,
    currency: "USDC",
    minUnits: 40,
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format",
    category: "Alimentos",
    available: true,
    createdAt: "2026-08-22",
  },
]
