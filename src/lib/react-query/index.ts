// React Query 统一入口
// 业务组件直接从此文件引入，避免深层路径依赖

export { ReactQueryProvider } from "./provider";
export { apiFetch, HttpError, type ApiError } from "./api-fetch";
export {
  // Styles
  useStyles,
  useStyle,
  useCreateStyle,
  useUpdateStyle,
  type StyleRecord,
  // Planning
  usePlanningList,
  useCreatePlanning,
  type PlanningRecord,
  // Inspiration boards
  useInspirationBoards,
  useCreateInspirationBoard,
  type InspirationBoardRecord,
  // Generic
  useBrands,
  useSeasons,
  useSuppliers,
  useSalesRecords,
  useTodos,
} from "./hooks";
