output "app_fqdn" {
  description = "Default public host of the container app; the CNAME target for the custom domain."
  value       = azurerm_container_app.app.ingress[0].fqdn
}

output "custom_domain_verification_id" {
  description = "Value of the asuid TXT record that proves domain ownership."
  value       = azurerm_container_app.app.custom_domain_verification_id
  sensitive   = true
}

output "registry_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "resource_group_name" {
  value = data.azurerm_resource_group.app.name
}

output "container_app_name" {
  value = azurerm_container_app.app.name
}
