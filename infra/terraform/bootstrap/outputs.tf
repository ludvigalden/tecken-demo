# The values the GitHub production environment variables are made from.
output "client_id" {
  description = "Becomes the AZURE_CLIENT_ID production variable."
  value       = azuread_application.cd.client_id
}

output "tenant_id" {
  description = "Becomes the AZURE_TENANT_ID production variable."
  value       = data.azuread_client_config.current.tenant_id
}

output "subscription_id" {
  description = "Becomes the AZURE_SUBSCRIPTION_ID production variable."
  value       = data.azurerm_client_config.current.subscription_id
}

output "app_resource_group_name" {
  value = azurerm_resource_group.app.name
}

output "state_resource_group_name" {
  value = azurerm_resource_group.state.name
}

output "state_storage_account_name" {
  value = azurerm_storage_account.state.name
}
