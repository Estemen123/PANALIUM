/** USDC con los decimales que haga falta (adelantos y comisiones pueden ser menores a un centavo). */
export function formatUsdc(value: number): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}
