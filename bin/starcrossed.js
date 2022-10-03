"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStarredRepos = exports.findPackageOrRequirements = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const findPackageOrRequirements = (dir = process.cwd(), fileType) => {
    let location = '';
    const files = (0, fs_1.readdirSync)(dir);
    for (const file of files) {
        const absolute = (0, path_1.join)(dir, file);
        if (file === 'node_modules') {
            continue;
        }
        if (absolute.includes(fileType)) {
            location = (0, path_1.resolve)(absolute);
        }
        if ((0, fs_1.lstatSync)(absolute).isDirectory()) {
            (0, exports.findPackageOrRequirements)(absolute, fileType);
        }
    }
    return location;
};
exports.findPackageOrRequirements = findPackageOrRequirements;
const getStarredRepos = (username, octokit) => __awaiter(void 0, void 0, void 0, function* () {
    const repos = yield octokit.request(`GET /users/${username}/starred`);
    const starredRepoList = repos.data.map((repo) => { return repo.html_url; });
    for (let i = 0; i < 10000; i++) {
        const checkForMoreThanOneHundred = yield octokit.request(`GET /users/${username}/starred?page=${i}`);
        if (checkForMoreThanOneHundred.data[0]) {
            checkForMoreThanOneHundred.data.forEach((repo) => {
                if (!starredRepoList.includes(repo.html_url)) {
                    starredRepoList.push(repo.html_url);
                }
            });
        }
        else {
            i = 10001;
        }
    }
    return starredRepoList;
});
exports.getStarredRepos = getStarredRepos;
