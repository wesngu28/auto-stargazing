import path from 'path'
import { Octokit } from "octokit"
import { readdirSync, lstatSync } from 'fs'

export const findPackageOrRequirements = (dir = process.cwd(), fileType: string) => {
    let location = '';
    const files = readdirSync(dir);
    for (const file of files) {
        const absolute = path.join(dir, file)
        if (file === 'node_modules') {
            continue
        }
        if (absolute.includes(fileType)) {
            location = path.resolve(absolute)
        }
        if (lstatSync(absolute).isDirectory()) {
            findPackageOrRequirements(absolute, fileType)
        }
    }
    return location
};

export const getStarredRepos = async (username: string, octokit: Octokit) => {
    const repos = await octokit.request(`GET /users/${username}/starred`)
    const starredRepoList = repos.data.map((repo: any) => { return repo.html_url })
    return starredRepoList;
}