import { join, resolve } from 'path'
import { Octokit } from "octokit"
import { readdirSync, lstatSync } from 'fs'

export const findPackageOrRequirements = (dir = process.cwd(), fileType: string) => {
    let location = ''
    const files = readdirSync(dir)
    for (const file of files) {
        const absolute = join(dir, file)
        if (file === 'node_modules') {
            continue
        }
        if (absolute.includes(fileType)) {
            location = resolve(absolute)
        }
        if (lstatSync(absolute).isDirectory()) {
            findPackageOrRequirements(absolute, fileType)
        }
    }
    return location
}

export const getStarredRepos = async (username: string, octokit: Octokit) => {
    const repos = await octokit.request(`GET /users/${username}/starred`)
    const starredRepoList = repos.data.map((repo: any) => { return repo.html_url })
    for (let i = 0; i < 10000; i++) {
        const checkForMoreThanOneHundred = await octokit.request(`GET /users/${username}/starred?page=${i}`)
        if(checkForMoreThanOneHundred.data[0]) {
            checkForMoreThanOneHundred.data.forEach((repo: any) => {
                if(!starredRepoList.includes(repo.html_url)) {
                    starredRepoList.push(repo.html_url)
                }
            })
        } else {
            i = 10001
        }
    }
    return starredRepoList
}