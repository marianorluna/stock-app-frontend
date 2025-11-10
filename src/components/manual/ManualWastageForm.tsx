import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  MenuItem
} from '@mui/material';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { ManualWastagePayload, WastagePreset, WastagePresetPayload } from '../../types';

type Props = {
  onSubmitted?: () => void;
};

type ManualWastageFormValues = {
  items: Array<{
    ingredient: string;
    quantity: number;
    unit: 'grams' | 'product' | 'purchase' | 'unit';
    reason?: string;
  }>;
};

const defaultValues: ManualWastageFormValues = {
  items: [{ ingredient: '', quantity: 0, unit: 'grams', reason: '' }]
};

const ManualWastageForm = ({ onSubmitted }: Props) => {
  const {
    ingredients,
    fetchIngredients,
    createWastage,
    wastagePresets,
    fetchWastagePresets,
    createWastagePreset,
    deleteWastagePreset
  } = useInventoryStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    createWastage: state.createWastage,
    wastagePresets: state.wastagePresets,
    fetchWastagePresets: state.fetchWastagePresets,
    createWastagePreset: state.createWastagePreset,
    deleteWastagePreset: state.deleteWastagePreset
  }));
  const ingredientOptions = ingredients.map((ingredient) => ({ label: ingredient.name, value: ingredient._id }));
  const [confirmPreset, setConfirmPreset] = useState<WastagePreset | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [presetCreationLoading, setPresetCreationLoading] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting }
  } = useForm<ManualWastageFormValues>({
    defaultValues
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });
  const watchedItems = useWatch({ control, name: 'items' }) ?? [];

  useEffect(() => {
    void fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    void fetchWastagePresets();
  }, [fetchWastagePresets]);

  const availableQuickButtons = useMemo(() => {
    if (!wastagePresets.length) return [];
    return wastagePresets
      .map((preset) => {
        const ingredientId =
          typeof preset.ingredient === 'string' ? preset.ingredient : preset.ingredient?._id ?? '';
        const ingredient = ingredients.find((candidate) => candidate._id === ingredientId);
        return { preset, ingredient, ingredientId };
      })
      .filter(({ ingredientId, ingredient }) => Boolean(ingredientId) && Boolean(ingredient));
  }, [ingredients, wastagePresets]);

  const onSubmit = handleSubmit(async (values) => {
    const items = values.items.reduce<ManualWastagePayload['items']>((acc, item) => {
      const ingredient = ingredients.find((candidate) => candidate._id === item.ingredient);
      if (!ingredient) {
        return acc;
      }
      const conversion =
        item.unit === 'purchase' || item.unit === 'unit'
          ? ingredient.conversionFactorToGrams || 1
          : 1;
      const quantity = Number(item.quantity ?? 0);
      if (!quantity || quantity <= 0) {
        return acc;
      }
      acc.push({
        ingredient: item.ingredient,
        quantityInGrams: quantity * conversion,
        reason: item.reason
      });
      return acc;
    }, []);

    if (items.length === 0) {
      return;
    }

    await createWastage({ items });
    reset(defaultValues);
    onSubmitted?.();
  });

  const handleCreatePreset = async () => {
    const formValues = getValues();
    const item = formValues.items?.[0];
    if (!item || !item.ingredient || !item.quantity || item.quantity <= 0) return;
    const ingredient = ingredients.find((candidate) => candidate._id === item.ingredient);
    if (!ingredient) return;

    const usesProductMeasurement =
      item.unit === 'product' || item.unit === 'purchase' || item.unit === 'unit';
    const conversion = usesProductMeasurement ? ingredient.conversionFactorToGrams || 1 : 1;
    const quantityInGrams = Number(item.quantity) * conversion;
    const productUnitLabel = ingredient.productUnit ?? ingredient.purchaseUnit ?? 'unidad';
    const unitLabel =
      item.unit === 'product'
        ? productUnitLabel
        : item.unit === 'purchase'
        ? ingredient.purchaseUnit ?? productUnitLabel
        : item.unit === 'unit'
        ? 'unidades'
        : 'g';
    const name = `${ingredient.name} (${item.quantity} ${unitLabel}${item.reason ? ` • ${item.reason}` : ''})`;

    const payload: WastagePresetPayload = {
      name,
      ingredient: ingredient._id,
      quantityInGrams,
      reason: item.reason?.trim() ? item.reason : undefined
    };

    const alreadyExists = wastagePresets.some((preset) => preset.name === payload.name);
    if (alreadyExists) return;

    setPresetCreationLoading(true);
    try {
      await createWastagePreset(payload);
    } finally {
      setPresetCreationLoading(false);
    }
  };

  const handleOpenPreset = (preset: WastagePreset) => {
    setConfirmPreset(preset);
  };

  const resolvePresetIngredientId = (preset: WastagePreset) =>
    typeof preset.ingredient === 'string' ? preset.ingredient : preset.ingredient?._id ?? '';

  const resolvePresetIngredientName = (preset: WastagePreset) => {
    if (typeof preset.ingredient === 'string') {
      const ingredient = ingredients.find((candidate) => candidate._id === preset.ingredient);
      return ingredient?.name ?? preset.ingredient;
    }
    return preset.ingredient.name;
  };

  const handleDeletePreset = async () => {
    if (!confirmPreset) return;
    setConfirmLoading(true);
    try {
      await deleteWastagePreset(confirmPreset._id);
      setConfirmPreset(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmPreset = async () => {
    if (!confirmPreset) return;
    const ingredientId = resolvePresetIngredientId(confirmPreset);
    if (!ingredientId) return;

    setConfirmLoading(true);
    try {
      await createWastage({
        items: [
          {
            ingredient: ingredientId,
            quantityInGrams: confirmPreset.quantityInGrams,
            reason: confirmPreset.reason ?? confirmPreset.name
          }
        ]
      });
      onSubmitted?.();
      setConfirmPreset(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Registrar merma manual
        </Typography>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          {availableQuickButtons.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Mermas rápidas disponibles
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap={{ xs: 'nowrap', sm: 'wrap' }} gap={1.5}>
                {availableQuickButtons.map(({ preset, ingredient }) => (
                  <Button
                    key={preset.name}
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleOpenPreset(preset)}
                    disabled={!ingredient || ingredient.stock <= 0}
                  >
                    {preset.name}
                  </Button>
                ))}
              </Stack>
            </Stack>
          )}
          {fields.map((field, index) => (
            <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name={`items.${index}.ingredient`}
                rules={{ required: true }}
                render={({ field: ingredientField }) => (
                  <Autocomplete
                    sx={{ minWidth: 240 }}
                    options={ingredientOptions}
                    value={ingredientOptions.find((option) => option.value === ingredientField.value) ?? null}
                    onChange={(_, value) => ingredientField.onChange(value?.value ?? '')}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    renderInput={(params) => <TextField {...params} label="Ingrediente" required />}
                  />
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.quantity`}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    label={`Cantidad (${(() => {
                      const selectedIngredientId = watchedItems?.[index]?.ingredient;
                      const selectedIngredient = ingredients.find((candidate) => candidate._id === selectedIngredientId);
                      const unitValue = watchedItems?.[index]?.unit ?? 'grams';
                      if (!selectedIngredient) return 'g';
                      if (unitValue === 'product') {
                        return selectedIngredient.productUnit ?? selectedIngredient.purchaseUnit ?? 'u';
                      }
                      if (unitValue === 'purchase') {
                        return selectedIngredient.purchaseUnit ?? 'u';
                      }
                      if (unitValue === 'unit') {
                        return 'unidades';
                      }
                      return 'g';
                    })()})`}
                    type="number"
                    value={field.value}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const normalizedValue = rawValue.replace(/^0+(?=\d)/, '');
                      event.target.value = normalizedValue;
                      field.onChange(normalizedValue === '' ? 0 : Number(normalizedValue));
                    }}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.unit`}
                render={({ field: unitField }) => {
                  const selectedIngredientId = watchedItems?.[index]?.ingredient;
                  const selectedIngredient = ingredients.find((candidate) => candidate._id === selectedIngredientId);
                  const category = selectedIngredient?.category ?? 'ingredient';
                  const productUnit = selectedIngredient?.productUnit?.trim();
                  const purchaseUnit = selectedIngredient?.purchaseUnit?.trim();
                  const meaningfulProductUnit =
                    productUnit &&
                    !['g', 'gramo', 'gramos'].includes(productUnit.toLowerCase());
                  const unitOptions = [
                    {
                      value: 'grams',
                      label: 'Gramos',
                      disabled: !(category === 'ingredient' || category === 'coffee')
                    },
                    {
                      value: 'unit',
                      label: 'Unidades',
                      disabled: category === 'ingredient' || category === 'coffee'
                    },
                    ...(meaningfulProductUnit
                      ? [
                          {
                            value: 'product',
                            label: productUnit,
                            disabled: false
                          }
                        ]
                      : []),
                    ...(purchaseUnit
                      ? [
                          {
                            value: 'purchase',
                            label: purchaseUnit,
                            disabled: false
                          }
                        ]
                      : [])
                  ];
                  const fallback = unitOptions.find((option) => !option.disabled)?.value ?? 'grams';
                  if (!unitOptions.some((option) => option.value === unitField.value && !option.disabled)) {
                    unitField.onChange(fallback);
                  }
                  return (
                    <TextField select label="Unidad" sx={{ minWidth: 120 }} value={unitField.value} onChange={unitField.onChange}>
                      {unitOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  );
                }}
              />
              <Controller
                control={control}
                name={`items.${index}.reason`}
                render={({ field }) => <TextField label="Razón" {...field} />}
              />
              <Button onClick={() => remove(index)} color="error">
                Eliminar
              </Button>
            </Stack>
          ))}
          <Button onClick={() => append({ ingredient: '', quantity: 0, unit: 'grams', reason: '' })}>Agregar merma</Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleCreatePreset}
            disabled={
              !watchedItems?.[0]?.ingredient ||
              !watchedItems?.[0]?.quantity ||
              watchedItems?.[0]?.quantity <= 0 ||
              presetCreationLoading
            }
          >
            Crear botón rápido con esta merma
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Registrar merma
          </Button>
        </Stack>
      </CardContent>
      <Dialog open={Boolean(confirmPreset)} onClose={() => setConfirmPreset(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar merma rápida</DialogTitle>
        <DialogContent dividers>
          {confirmPreset && (
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                {confirmPreset.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingrediente: {resolvePresetIngredientName(confirmPreset)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cantidad: {confirmPreset.quantityInGrams} g
              </Typography>
              {confirmPreset.reason && (
                <Typography variant="body2" color="text.secondary">
                  Motivo: {confirmPreset.reason}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Esta acción registrará la merma y actualizará el inventario inmediatamente.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPreset(null)} disabled={confirmLoading}>
            Cancelar
          </Button>
          <Button onClick={handleDeletePreset} color="error" variant="outlined" disabled={confirmLoading}>
            Eliminar botón
          </Button>
          <Button onClick={handleConfirmPreset} variant="contained" disabled={confirmLoading}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ManualWastageForm;

