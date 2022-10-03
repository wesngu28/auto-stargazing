#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = require("octokit");
const dotenv = __importStar(require("dotenv"));
const fs_1 = require("fs");
const node_html_parser_1 = require("node-html-parser");
const node_fetch_1 = __importDefault(require("node-fetch"));
const query_string_1 = __importDefault(require("query-string"));
const starcrossed_1 = require("./starcrossed");
const { Input, Confirm, Select } = require('enquirer');
dotenv.config();
const askUsePackage = new Confirm({
    name: 'existingPackage',
    message: 'An existing file was detected in your current folder. Would you like to use it?'
});
const askLocation = new Input({
    name: 'location',
    message: 'What is the absolute path of your dependencies file?',
    validate(value) {
        return value ? true : `Please enter the absolute path.`;
    },
});
const askUsername = new Input({
    name: 'username',
    message: 'Please provide your GitHub username.',
    validate(value) {
        return value ? true : `Please enter your username.`;
    },
});
const askPermission = new Confirm({
    name: 'question',
    message: 'Would you like to confirm each package before starring?'
});
const askToken = new Input({
    name: 'token',
    message: 'You do not seem to have a GITHUB_TOKEN specified in your environment variables. Please provide one in a .env file or enter it here.'
});
const askLanguage = new Select({
    name: 'language',
    message: 'Are you looking for package.json or requirements.txt?',
    validate(value) {
        return value.length === 0 ? `Select at least one option.` : true;
    },
    limit: 2,
    choices: [
        { name: 'package.json', value: '#00ffff' },
        { name: 'requirements.txt', value: '#000000' },
    ]
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const language = yield askLanguage.run();
        const username = yield askUsername.run();
        const perm = yield askPermission.run();
        let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            GITHUB_TOKEN = yield askToken.run();
        }
        const octokit = new octokit_1.Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
        let absolutePath = (0, starcrossed_1.findPackageOrRequirements)(process.cwd(), language);
        if (absolutePath) {
            const usePackage = yield askUsePackage.run();
            if (!usePackage) {
                absolutePath = yield askLocation.run();
            }
        }
        else {
            absolutePath = yield askLocation.run();
        }
        let fileContents = (0, fs_1.readFileSync)(absolutePath);
        let packageList = [];
        if (absolutePath.includes('.json')) {
            const parsedJson = JSON.parse(String(fileContents));
            const dependencies = Object.keys(parsedJson.dependencies);
            const devDependencies = Object.keys(parsedJson.devDependencies);
            const npmPackages = [];
            dependencies.forEach(dependencies => {
                npmPackages.push(`https://www.npmjs.com/package/${dependencies}`);
            });
            devDependencies.forEach(devDependency => {
                npmPackages.push(`https://www.npmjs.com/package/${devDependency}`);
            });
            const npmPackagefmt = npmPackages.map((dependency) => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield (0, node_fetch_1.default)(dependency);
                const text = yield response.text();
                const html = (0, node_html_parser_1.parse)(text);
                return html.querySelector('#repository-link').text.replace('github.com/', '');
            }));
            packageList = yield Promise.all(npmPackagefmt);
        }
        if (absolutePath.includes('.txt')) {
            const textSplit = fileContents.toString().split("\n");
            const pypiPackages = textSplit.map((requirement) => {
                const equals = requirement.indexOf('=');
                const equalToEnd = requirement.substring(equals, requirement.length);
                requirement = requirement.replace(equalToEnd, '');
                return requirement;
            });
            const pipPackagefmt = pypiPackages.map((pipPackage) => __awaiter(void 0, void 0, void 0, function* () {
                var _b;
                const pipName = `https://pypi.org/project/${pipPackage}`;
                const response = yield (0, node_fetch_1.default)(`https://pypi.org/project/${pipPackage}`);
                const text = yield response.text();
                const html = (0, node_html_parser_1.parse)(text);
                const github = (_b = html.querySelector('.github-repo-info')) === null || _b === void 0 ? void 0 : _b.getAttribute('data-url');
                if (github)
                    return github.replace('https://api.github.com/repos/', '');
                const queryString = query_string_1.default.stringify({
                    q: `${pipName.replace('https://pypi.org/project/', '')} in:name`,
                    sort: 'stars',
                    order: 'desc',
                });
                const potentialGithub = yield octokit.request(`GET /search/repositories?${queryString}`);
                const potentialGithubUrl = potentialGithub.data.items[0].full_name;
                return potentialGithubUrl;
            }));
            packageList = yield Promise.all(pipPackagefmt);
        }
        const starredRepos = yield (0, starcrossed_1.getStarredRepos)(username, octokit);
        const gitHubUrls = packageList.map((dependency) => {
            return `https://github.com/${dependency}`;
        });
        let filteredStarStatus = gitHubUrls.filter(repo => repo !== undefined);
        const removeDuplicate = [...new Set(filteredStarStatus)];
        filteredStarStatus = Array.from(removeDuplicate);
        const getUnstarredRepos = filteredStarStatus.map((dependency, idx) => {
            if (starredRepos.includes(dependency)) {
                console.log(`You have already starred ${packageList[idx]}`);
            }
            else {
                return dependency;
            }
        });
        for (const repo of getUnstarredRepos) {
            const authorSlashRepo = repo.replace('https://github.com/', '');
            const split = authorSlashRepo.split('/');
            if (perm) {
                const askStar = new Confirm({
                    name: 'question',
                    message: `Would you like to star ${split[1]} by ${split[0]}`
                });
                const confirmation = yield askStar.run();
                if (confirmation) {
                    yield octokit.request('PUT /user/starred/{owner}/{repo}', {
                        owner: split[0],
                        repo: split[1]
                    });
                    console.log(`Starred ${split[1]} by ${split[0]}`);
                }
            }
            else {
                yield octokit.request('PUT /user/starred/{owner}/{repo}', {
                    owner: split[0],
                    repo: split[1]
                });
                console.log(`Starred ${split[1]} by ${split[0]}`);
            }
        }
    }
    catch (_a) {
        console.error;
    }
});
main();
