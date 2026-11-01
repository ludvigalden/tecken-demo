variable "prefix" {
  description = "Name prefix; every Azure resource name derives from it."
  type        = string
  default     = "tecken"
}

# The first revision's image. Deployments replace it (the deploy workflow
# updates the container app by digest), and Terraform ignores the change.
variable "image" {
  description = "Container image for the first revision."
  type        = string
  default     = "mcr.microsoft.com/k8se/quickstart:latest"
}

# Empty until the custom domain's DNS records exist; the domain resources
# stay at count zero while it is empty, so provisioning never waits on DNS.
variable "public_hostname" {
  description = "Custom domain served by the container app."
  type        = string
  default     = ""
}
