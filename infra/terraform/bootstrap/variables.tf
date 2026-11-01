variable "prefix" {
  description = "Name prefix; every Azure resource name derives from it."
  type        = string
  default     = "tecken"
}

variable "github_owner" {
  description = "GitHub owner login of the repository that deploys."
  type        = string
  default     = "ludvigalden"
}

variable "github_repository_name" {
  description = "GitHub repository name that deploys."
  type        = string
  default     = "tecken-demo"
}

variable "github_repository" {
  description = "owner/name of the deploying repository."
  type        = string
  default     = "ludvigalden/tecken-demo"
}

# GitHub's immutable IDs (public, from the GitHub API), used in the numeric
# OIDC subject form.
variable "github_owner_id" {
  description = "Immutable GitHub user ID of the owner."
  type        = string
  default     = "30798446"
}

variable "github_repository_id" {
  description = "Immutable GitHub repository ID, supplied at apply time (TF_VAR_github_repository_id); never committed."
  type        = string
}
