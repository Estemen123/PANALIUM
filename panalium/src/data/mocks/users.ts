import type { User } from "@/domain"

export const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Carlos Mendoza",
    email: "carlos@mail.com",
    phone: "+58 412 555-0100",
    role: "buyer",
    wallet: {
      usdc: 2450.0,
      bs: 85000,
      address: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
    createdAt: "2026-08-31",
    verified: true,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
  },
  {
    id: "u2",
    name: "Distribuidora Pérez CA",
    email: "mayorista@distperez.com",
    phone: "+58 424 555-0200",
    role: "wholesaler",
    wallet: {
      usdc: 48200.0,
      bs: 1250000,
      address: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    },
    createdAt: "2026-08-27",
    verified: true,
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&auto=format",
  },
  {
    id: "u3",
    name: "Admin Sistema",
    email: "admin@panalium.io",
    phone: "+58 212 555-0001",
    role: "admin",
    wallet: {
      usdc: 0,
      bs: 0,
      address: "0x9f8e7d6c5b4a39281706f5e4d3c2b1a098765432",
    },
    createdAt: "2026-08-24",
    verified: true,
  },
  {
    id: "u4",
    name: "Luisa Torres",
    email: "luisa@mail.com",
    phone: "+58 414 555-0300",
    role: "buyer",
    wallet: {
      usdc: 800,
      bs: 22000,
      address: "0x1122334455667788990011223344556677889900",
    },
    createdAt: "2026-09-02",
    verified: true,
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b593?w=80&h=80&fit=crop&auto=format",
  },
  {
    id: "u5",
    name: "Ricardo Blanco",
    email: "ricardo@mail.com",
    phone: "+58 416 555-0400",
    role: "buyer",
    wallet: {
      usdc: 3100,
      bs: 95000,
      address: "0xaabbccddeeff00112233445566778899aabbccdd",
    },
    createdAt: "2026-08-29",
    verified: false,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format",
  },
]
