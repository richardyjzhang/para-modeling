import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ModelingView from "../views/ModelingView.vue";
import ProjectListView from "../views/ProjectListView.vue";

/** vue-router@4：/ 占位首页，/projects 列表，/projects/:id 建模页。 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/projects", name: "projects", component: ProjectListView },
    { path: "/projects/:id", name: "modeling", component: ModelingView },
  ],
});
